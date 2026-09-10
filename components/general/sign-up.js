'use client'

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { auth } from "@/firebase"
import { syncServerSession, signOutSession } from "@/lib/firebase/client-session"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { handleGoogleAuth } from "@/lib/firebase/auth-utils"
import { useAuth } from '@/lib/firebase/auth-context';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { 
    faSignature,
    faPhone,
    faEnvelope,
} from '@awesome.me/kit-237330da78/icons/classic/regular'

import { didot } from "@/lib/fonts"

export function SignUp() {
    const searchParams = useSearchParams()
    const newUserEmail = searchParams.get('email')

    const { user } = useAuth()
    const [signUpError, setSignUpError] = useState(null)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting }
    } = useForm({
        defaultValues: {
            email: newUserEmail || '',
            password: '',
            confirmPassword: ''
        }
    })

    const password = watch("password")

    const onSubmit = async (data) => {
        try {
            if(user) await signOutSession();
            //auth does this automatically
            // const userExists = await getUser(data.email)
            // if (userExists) throw new Error("User already exists")

            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
            if (!userCredential) throw new Error("User not created")
            const session = await syncServerSession(userCredential.user);
            if (session.skipped) throw new Error("Your sign-in changed. Please try again.");

            router.replace("/partners/dashboard");
            router.refresh() // Navigate to the tenant dashboard
        } catch (error) {
            console.error("Error signing up:", error)
            setSignUpError(error.message)
        }
    }

    const handleGoogleSignUp = async () => {
        setIsGoogleLoading(true);
        setSignUpError(null);
        try {
            if (user) await signOutSession();
            await handleGoogleAuth(
                () => { router.replace("/partners/dashboard"); router.refresh(); },
                error => setSignUpError(error.message),
            );
        } catch (error) {
            setSignUpError(error.message);
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col p-3 gap-4 min-w-80"
        >
            <div className="space-y-1">
                <label 
                    className="group input input-bordered flex items-center gap-2 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
                >
                    <FontAwesomeIcon icon={faEnvelope} className='h-5 w-5'/>
                    <input 
                        type="email" 
                        {...register("email", {
                            required: "Email is required",
                            pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Invalid email address"
                            }
                        })}
                        placeholder="Email"
                        readOnly
                        className={`grow text-base-content placeholder:text-base-content placeholder:font-didot`}
                    />
                </label>
                {errors.email && (
                    <p className="text-error-content text-sm">{errors.email.message}</p>
                )}
            </div>

            <div className="space-y-1">
                <label 
                    className="group input input-bordered flex items-center gap-2 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
                >
                    <FontAwesomeIcon icon={faEnvelope} className='h-5 w-5'/>
                    <input 
                        type="password"
                        {...register("password", {
                            required: "Password is required",
                            minLength: {
                                value: 6,
                                message: "Password must be at least 6 characters"
                            }
                        })}
                        placeholder="Password"
                        className={`grow text-base-content placeholder:text-base-content placeholder:font-didot`}
                    />
                </label>
                {errors.password && (
                    <p className="text-error-content text-sm">{errors.password.message}</p>
                )}
            </div>

            <div className="space-y-1">
                <label 
                    className="group input input-bordered flex items-center gap-2 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
                >
                    <FontAwesomeIcon icon={faEnvelope} className='h-5 w-5'/>
                    <input 
                        type="password"
                        {...register("confirmPassword", {
                            required: "Please confirm your password",
                            validate: value => value === password || "Passwords do not match"
                        })}
                        placeholder="Confirm Password"
                        className={`grow text-base-content placeholder:text-base-content placeholder:font-didot`}
                    />
                </label>
                {errors.confirmPassword && (
                    <p className="text-error-content text-sm">{errors.confirmPassword.message}</p>
                )}
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="p-2 rounded-md bg-success font-semibold text-lg text-success-content disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? "Signing up..." : "Sign Up"}
            </button>
            
            {signUpError && (
                <p className="text-error-content text-sm">{signUpError}</p>
            )}
            
            <div className="divider text-base-content">OR</div>
            <button 
                type="button" 
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading}
                className="btn bg-white text-black border-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
                {isGoogleLoading ? "Signing up..." : "Sign up with Google"}
            </button>
        </form>
    )
}
