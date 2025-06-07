'use client';

import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { vapi } from '@/lib/vapi.sdk';
import { toast } from 'sonner';

type SavedMessage = {
    role: string;
    content: string;
};


enum CallStatus{
    INACTIVE = 'INACTIVE',
    CONNECTING = "CONNECTING",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
    ERROR = "ERROR"
}

const Agent = ({ userName, userId, type }: AgentProps) => {
    const router = useRouter();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [messages, setMessages] = useState<SavedMessage[]>([]);


    useEffect(() => {
        const onCallStart = () => {
            setCallStatus(CallStatus.ACTIVE);
            setErrorMessage("");
        };
        
        const onCallEnd = () => {
            setCallStatus(CallStatus.FINISHED);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        };

        const onMessage = (message: Message) => {
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage = { role: message.role, content: message.transcript }
                setMessages((prev) => [...prev, newMessage]);

            }
        }

        const onSpeechStart = () => setIsSpeaking(true);
        const onSpeechEnd = () => setIsSpeaking(false);
        

        const onError = (error: Error | any) => {
            console.error('Vapi Error:', error);
            
            const errorMsg = typeof error === 'string' 
                ? error 
                : error?.message || 'Unknown error';
            
            const isEjectionError = 
                errorMsg.includes('Meeting ended due to ejection') || 
                errorMsg.includes('Meeting has ended') ||
                errorMsg.includes('disconnected');
            
            if (isEjectionError) {
                setErrorMessage("Call disconnected: Session ended unexpectedly");
                setCallStatus(CallStatus.ERROR);
                
                try {
                    vapi.stop();
                } catch (e) {
                    console.log('Error stopping call:', e);
                }
                
                toast.error("Call disconnected. Please try again later.");
            } else {
                setErrorMessage(`Error: ${errorMsg}`);
                setCallStatus(CallStatus.ERROR);
                toast.error("Call error. Please try again.");
            }
        };
        
        const handleWindowError = (event: ErrorEvent) => {
            if (event.message.includes('WebSocket') || 
                event.message.includes('network') ||
                event.message.includes('Meeting has ended') ||
                event.message.includes('Meeting ended due to ejection')) {
                console.log("Window error related to WebSocket:", event);
                setErrorMessage("Connection error. Please try again.");
                setCallStatus(CallStatus.ERROR);
            }
        };
        
        window.addEventListener('error', handleWindowError);     
        
        vapi.on('call-start', onCallStart);
        vapi.on('call-end', onCallEnd);
        vapi.on('message', onMessage);
        vapi.on('speech-start', onSpeechStart);
        vapi.on('speech-end', onSpeechEnd);
        vapi.on('error', onError);

        return () => {
            window.removeEventListener('error', handleWindowError);
            vapi.off('call-end', onCallEnd);
            vapi.off('call-start', onCallStart);
            vapi.off('message', onMessage);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('error', onError);
        }
    },[])


    useEffect(() => {
        if (callStatus === CallStatus.FINISHED) router.push('/');

    },[messages, callStatus, userId, type])

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);

        await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
            variableValues: {
                username: userName,
                userid: userId,
            }
        })
    }

    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);

        vapi.stop();
    }

    const latestMessage = messages[messages.length - 1]?.content;
    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED

    return (
        <>
            <div className='call-view'>
                <div className='card-interviewer'>
                    <div className='avatar'>
                        <Image src='/ai-avatar.png' alt='vapi' width={65} height={54} className='object-cover' />
                        {isSpeaking && <span className='animate-speak' />}
                    </div>
                    <h3>AI Interviewer</h3>
                </div>

                <div className='card-border'>
                    <div className='card-content'>
                        <Image src='/user-avatar.png' alt='user avatar' width={540} height={540} className='rounded-full object-cover size-[120px]' />
                        <h3>{userName}</h3>
                    </div>
                </div>
            </div>  
            
            {messages.length > 0 && (
                <div className='transcript-border'>
                    <div className="transcript">
                        <p className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')} key={latestMessage}>
                            {latestMessage}
                        </p>
                    </div>

                </div>
            )}

            <div className="w-full flex justify-center">
                {callStatus !== "ACTIVE" ? (
                    <button className='relative btn-call' onClick={handleCall}>
                        <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus !== 'CONNECTING' && 'hidden')} />
                        <span>
                            {isCallInactiveOrFinished ? "Call" : ". . ."}
                        </span>
                        
                    </button>
                ) : (
                    <button className='btn-disconnect' onClick={handleDisconnect}>End</button>
                )}
            </div>
        </>
    )
}

export default Agent
