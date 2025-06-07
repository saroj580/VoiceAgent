'use client';

import Image from 'next/image'
import React, { useEffect, useState, useRef } from 'react'
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { vapi } from '@/lib/vapi.sdk';
import { toast } from 'sonner';
import { interviewer } from '@/constants';

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

const Agent = ({ userName, userId, type, interviewId, questions }: AgentProps) => {
    const router = useRouter();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const messagesRef = useRef<SavedMessage[]>([]);
    
    // Track if component is mounted to prevent state updates after unmounting
    const isMounted = useRef(true);

    // Store messages in ref to access in cleanup
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    useEffect(() => {
        // Set mounted flag
        isMounted.current = true;
        
        const onCallStart = () => {
            if (!isMounted.current) return;
            setCallStatus(CallStatus.ACTIVE);
            setErrorMessage("");
        };
        
        const onCallEnd = () => {
            if (!isMounted.current) return;
            setCallStatus(CallStatus.FINISHED);
            
            // Save interview data if we have messages
            if (messagesRef.current.length > 0 && type === "generate") {
                saveInterviewData();
            }
            
            setTimeout(() => {
                if (isMounted.current) {
                    router.push('/');
                }
            }, 2000);
        };

        const onMessage = (message: Message) => {
            if (!isMounted.current) return;
            if (message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage = { role: message.role, content: message.transcript }
                setMessages((prev) => [...prev, newMessage]);
            }
        }

        const onSpeechStart = () => {
            if (!isMounted.current) return;
            setIsSpeaking(true);
        };
        
        const onSpeechEnd = () => {
            if (!isMounted.current) return;
            setIsSpeaking(false);
        };
        
        const onError = (error: Error | any) => {
            if (!isMounted.current) return;
            console.error('Vapi Error:', error);
            
            const errorMsg = typeof error === 'string' 
                ? error 
                : error?.errorMsg || error?.message || 'Unknown error';
            
            const isEjectionError = 
                errorMsg.includes('Meeting ended due to ejection') || 
                errorMsg.includes('Meeting has ended') ||
                errorMsg.includes('disconnected');
            
            if (isEjectionError) {
                setErrorMessage("Call disconnected: Session ended unexpectedly");
                setCallStatus(CallStatus.ERROR);
                
                // Save interview data if we have messages before disconnection
                if (messagesRef.current.length > 0 && type === "generate") {
                    saveInterviewData();
                }
                
                try {
                    vapi.stop();
                } catch (e) {
                    console.log('Error stopping call:', e);
                }
                
                toast.error("Call disconnected. Your progress has been saved.");
            } else {
                setErrorMessage(`Error: ${errorMsg}`);
                setCallStatus(CallStatus.ERROR);
                toast.error("Call error. Please try again.");
            }
        };
        
        const handleWindowError = (event: ErrorEvent) => {
            if (!isMounted.current) return;
            if (event.message.includes('WebSocket') || 
                event.message.includes('network') ||
                event.message.includes('Meeting has ended') ||
                event.message.includes('Meeting ended due to ejection')) {
                console.log("Window error related to WebSocket:", event);
                setErrorMessage("Connection error. Please try again.");
                setCallStatus(CallStatus.ERROR);
                
                // Save interview data if we have messages before error
                if (messagesRef.current.length > 0 && type === "generate") {
                    saveInterviewData();
                }
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
            isMounted.current = false;
            window.removeEventListener('error', handleWindowError);
            vapi.off('call-end', onCallEnd);
            vapi.off('call-start', onCallStart);
            vapi.off('message', onMessage);
            vapi.off('speech-start', onSpeechStart);
            vapi.off('speech-end', onSpeechEnd);
            vapi.off('error', onError);
            
            // Clean up any active call when component unmounts
            try {
                vapi.stop();
            } catch (e) {
                console.log('Error stopping call on unmount:', e);
            }
        }
    }, []);

    // Function to save interview data
    const saveInterviewData = async () => {
        if (messagesRef.current.length === 0 || !userId) return;
        
        try {
            // Extract questions from AI messages
            const aiMessages = messagesRef.current.filter(msg => msg.role === 'assistant');
            const questions = aiMessages.map(msg => msg.content);
            
            if (questions.length === 0) return;
            
            // Extract user messages for analysis
            const userMessages = messagesRef.current.filter(msg => msg.role === 'user');
            const userText = userMessages.map(msg => msg.content).join(' ').toLowerCase();
            
            // Extract role information
            let role = "Software Developer"; // Default role
            if (userText.includes('frontend') || userText.includes('front end') || userText.includes('front-end')) {
                role = "Frontend Developer";
            } else if (userText.includes('backend') || userText.includes('back end') || userText.includes('back-end')) {
                role = "Backend Developer";
            } else if (userText.includes('fullstack') || userText.includes('full stack') || userText.includes('full-stack')) {
                role = "Full Stack Developer";
            } else if (userText.includes('devops')) {
                role = "DevOps Engineer";
            } else if (userText.includes('data scientist') || userText.includes('data science')) {
                role = "Data Scientist";
            } else if (userText.includes('machine learning') || userText.includes('ml engineer')) {
                role = "ML Engineer";
            } else if (userText.includes('mobile')) {
                role = "Mobile Developer";
            }
            
            // Extract level information
            let level = "Mid-level"; // Default level
            if (userText.includes('junior') || userText.includes('entry') || userText.includes('beginner')) {
                level = "Junior";
            } else if (userText.includes('senior') || userText.includes('experienced') || userText.includes('expert')) {
                level = "Senior";
            } else if (userText.includes('lead') || userText.includes('principal')) {
                level = "Lead";
            }
            
            // Extract interview type
            let type = "technical"; // Default type
            if (userText.includes('behavioral') || userText.includes('behavioural') || userText.includes('soft skills')) {
                type = "behavioral";
            } else if (userText.includes('mixed') || userText.includes('both technical and behavioral')) {
                type = "mixed";
            }
            
            // Extract tech stack using mappings from constants/index.ts
            const techstack = [];
            const words = userText.split(/\s+/);
            
            // Check each word against mappings
            for (const word of words) {
                const cleanWord = word.replace(/[.,;:!?()]/g, '').toLowerCase();
                if (mappings[cleanWord]) {
                    const normalizedTech = mappings[cleanWord];
                    if (!techstack.includes(normalizedTech)) {
                        techstack.push(normalizedTech);
                    }
                }
            }
            
            // Also check for multi-word tech stacks (e.g., "react js", "node js")
            for (const key in mappings) {
                if (key.includes('.') || key.includes(' ')) {
                    const normalizedKey = key.toLowerCase();
                    if (userText.includes(normalizedKey)) {
                        const normalizedTech = mappings[key];
                        if (!techstack.includes(normalizedTech)) {
                            techstack.push(normalizedTech);
                        }
                    }
                }
            }
            
            // If no tech stack is detected, use default
            if (techstack.length === 0) {
                techstack.push("JavaScript", "React");
            }
            
            // Create interview object with extracted data
            const interviewData = {
                type,
                role,
                level,
                techstack,
                amount: questions.length,
                userid: userId
            };
            
            // Send to API to save
            const response = await fetch('/api/vapi/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(interviewData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to save interview data');
            }
            
            console.log('Interview data saved successfully');
        } catch (error) {
            console.error('Error saving interview data:', error);
            toast.error("Failed to save interview data");
        }
    };

    

    useEffect(() => {
        const handleGenerateFeedback = async (messages: SavedMessage[]) => {
            console.log('Generate feedback here ...');


            const { success, id } = {
                success: true,
                id : 'feedback-id'
            }
            if(success && id){
                router.push(`/interview/${interviewId}/feedback`)
            } else {
                console.log("Error saving feedback");
                router.push("/");
            }
        }

        
        if (callStatus === CallStatus.FINISHED) {
            if (type === 'generate') {
                router.push('/');
            } else {
                handleGenerateFeedback(messages);
            }
        }
    }, [messages, callStatus, type, userId, router]);

    

    const handleCall = async () => {
        setCallStatus(CallStatus.CONNECTING);

            if (type === 'generate') {
                await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
                    variableValues: {
                        username: userName,
                        userid: userId,
                    }
                });
            } else {
                let formattedQuestions = '';
                if (questions) {
                    formattedQuestions = questions.map((question) => `- ${question}\n`).join('\n');
                }

                await vapi.start(interviewer, {
                    variableValues: {
                        questions: formattedQuestions,
                    }
                })
            }
    }

    const handleDisconnect = async () => {
        setCallStatus(CallStatus.FINISHED);
        
        // Save interview data before disconnecting
        if (messagesRef.current.length > 0 && type === "generate") {
            await saveInterviewData();
        }
        
        try {
            vapi.stop();
        } catch (e) {
            console.log('Error stopping call:', e);
        }
    }

    const latestMessage = messages[messages.length - 1]?.content;
    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED

    // Rest of the component remains the same
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
