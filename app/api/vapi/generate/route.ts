import { getRandomInterviewCover } from '@/lib/utils';
import { google } from '@ai-sdk/google';
import { db } from "@/firebase/admin";
import { generateText } from 'ai';

export async function GET() {
    return Response.json({ success: true, data: 'THANK YOU' }, { status: 200 });
}

export async function POST(request : Request) {
    try {
        const {type, role, level, techstack, amount, userid } = await request.json();
        
        // Validate required fields
        if (!type || !role || !level || !techstack || !amount || !userid) {
            return Response.json({ 
                success: false, 
                error: "Missing required fields" 
            }, { status: 400 });
        }

        // Ensure techstack is a string before splitting
        const techstackArray = typeof techstack === 'string' 
            ? techstack.split(',') 
            : Array.isArray(techstack) ? techstack : [];

        let parsedQuestions;
        
        try {
            const { text : questions } = await generateText({
                model: google("gemini-2.0-flash-001"),
                prompt: `Prepare questions for a job interview.
                The job role is ${role}.
                The job experience level is ${level}.
                The tech stack used in the job is: ${techstack}.
                The focus between behavioural and technical questions should lean towards: ${type}.
                The amount of questions required is: ${amount}.
                Please return only the questions, without any additional text.
                The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
                Return the questions formatted like this:
                ["Question 1", "Question 2", "Question 3"]
                
                Thank you! <3`,
            });

            // Safely parse the questions JSON
            try {
                parsedQuestions = JSON.parse(questions);
                // Validate that it's an array
                if (!Array.isArray(parsedQuestions)) {
                    throw new Error("Questions format is invalid");
                }
            } catch (parseError) {
                console.error("Error parsing questions JSON:", parseError);
                // If parsing fails, create a simple array with the raw text
                parsedQuestions = [questions];
            }
        } catch (aiError) {
            console.error("Error generating questions with AI:", aiError);
            return Response.json({ 
                success: false, 
                error: "Failed to generate interview questions" 
            }, { status: 500 });
        }

        // Create the interview document
        const interview = {
            role, 
            type, 
            level,
            techstack: techstackArray,
            questions: parsedQuestions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString(),
        }

        // Add to Firestore with explicit error handling
        try {
            const docRef = await db.collection('interviews').add(interview);
            console.log("Interview saved with ID:", docRef.id);
            return Response.json({success: true, interviewId: docRef.id}, {status: 200});
        } catch (dbError) {
            console.error("Firestore error:", dbError);
            return Response.json({ 
                success: false, 
                error: "Failed to save interview to database" 
            }, { status: 500 });
        }
    } catch (error) {
        console.error("API Error:", error);
        return Response.json({ 
            success: false, 
            error: "Failed to process request" 
        }, { status: 500 });
    }
}
