"use client"

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import FormField from "./FormField"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/firebase/client"
import { signIn, signUp } from "@/lib/actions/auth.action"



const authFormSchema = (type: FormType) => {
    
  return z.object({
    name: type === 'sign-up' ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password : z.string().min(3)
  })
}

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const formSchema = authFormSchema(type);
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password : "",
    },
  })

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (type === 'sign-up') {

        const { name, email, password } = values;
        const userCredentials = await createUserWithEmailAndPassword(auth, email, password);

        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email,
          password
        })

        if (!result?.success) {
          toast.error(result?.message);
          return;
        }

        toast.success("Account created successfully. Please sign-in");
        router.push('/sign-in');

      } else {
        const { email, password } = values;
        const userCredentials = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredentials.user.getIdToken();

        if (!idToken) {
          toast.error("SignIn failed");
          return;
        }

        await signIn({
          email,
          idToken
        })

        toast.success("Sign in successfully.");
        router.push('/');
      }
      
    } catch (error) {
      console.log(error);
      toast.error(`There is an error : ${error}`);
    }
    console.log(values)
  }
  const isSignIn = type === 'sign-in';

  return (
    <div className="card-border md:min-w-[450px] lg:min-w-[500px] mx-auto">
      <div className="flex flex-col gap-2 card py-8 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src='/logo.svg' alt="logo" height={28} width={34} />
          <h2 className="text-primary-100">PreWise</h2>
        </div>
        <h3 className="text-center text-base">Practice Job Interview by AI powered</h3>
    
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full mt-2 form">
        {!isSignIn && (
          <FormField
            control={form.control}
            name="name"
            label='Name'
            placeholder="Your Name"
            type="text"
          />
        )}
        <FormField
          control={form.control}
          name="email"
          label='Email'
          placeholder="Your Email"
          type="email"
        />
        <FormField
          control={form.control}
          name="password"
          label='Password'
          placeholder="******"
          type="password"
        />
        <Button type="submit" className="btn">{isSignIn ? 'Sign-in' : 'Create an Account'}</Button>
          </form>
        </Form>
        <p className="text-center">
          {isSignIn ? 'No account yet?' : "Have an account already?"}
          <Link href={!isSignIn ? '/sign-in' : '/sign-up'} className="font-bold text-user-primary ml-1">{!isSignIn ? "Sign in" : "Sign up"}</Link>
        </p>
      </div>
    </div>
  )
}

export default AuthForm
