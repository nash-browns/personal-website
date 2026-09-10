'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { signInWithEmailAndPassword, sendPasswordResetEmail, getAuth } from "firebase/auth"
import { auth } from "@/firebase"
import { syncServerSession } from "@/lib/firebase/client-session"
import { handleGoogleAuth } from "@/lib/firebase/auth-utils"
import { useRouter } from "next/navigation"

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { 
    faEnvelope,
    faKey,
} from '@awesome.me/kit-237330da78/icons/classic/regular'


export function Login() {
    const [loginError, setLoginError] = useState(null)
    const [isGoogleLoading, setIsGoogleLoading] = useState(false)
    const router = useRouter()

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }
    } = useForm({
        defaultValues: {
            email: '',
            password: ''
        }
    })

    const onSubmit = async (data) => {
        setLoginError(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password)
            const session = await syncServerSession(userCredential.user);
            if (session.skipped) throw new Error('Your sign-in changed. Please try again.');
            router.replace("/partners/dashboard");
            router.refresh();
        } catch (error) {
            console.error("Error logging in:", error)
            setLoginError(error.message)
        }
    }

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true)
        setLoginError(null)
        
        await handleGoogleAuth(
            // Success callback
            (result) => {
                router.replace("/partners/dashboard");
                router.refresh();
            },
            // Error callback
            (error) => {
                console.error("Error signing in with Google:", error);
                setLoginError(error.message);
            }
        );
        
        setIsGoogleLoading(false);
    }

    return (
        <div className="mx-auto w-full md:p-10 py-5 md:py-0">
            <h1 className={`text-center text-2xl sm:text-5xl font-didot text-base-content`}>Login</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="">
                <div className="w-full mt-5 sm:mt-8">
                    <div className="mx-auto w-full sm:max-w-md md:max-w-lg flex flex-col gap-0">
                        <div className="space-y-1">
                            <label 
                                className="group input input-bordered flex items-center gap-2 mb-5 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
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
                                    className={`text-base-content placeholder:text-base-content placeholder:font-didot`}
                                />
                            </label>
                            {errors.email && (
                                <p className="text-red-500 text-sm">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label 
                                className="group input input-bordered flex items-center gap-2 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
                            >
                                <FontAwesomeIcon icon={faKey} className='h-5 w-5'/>
                                <input
                                    type="password"
                                    {...register("password", {
                                        required: "Password is required"
                                    })}
                                    placeholder="Password"
                                    className={`text-base-content placeholder:text-base-content placeholder:font-didot`}
                                />
                            </label>
                            {errors.password && (
                                <p className="text-red-500 text-sm">{errors.password.message}</p>
                            )}
                        </div>

                        <div>
                            <button 
                                type="button"
                                onClick={()=>document.getElementById('forgot-password-modal').showModal()}
                                className="btn btn-link btn-xs text-xs text-base-content mb-3"
                                tabIndex={-1}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 justify-center items-center">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2 w-full font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm hover:bg-opacity-20 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Logging in..." : "Log In"}
                            </button>
                            {loginError && (
                                <p className="text-error-content text-sm">{loginError}</p>
                            )}
                            <div className="divider text-base-content">OR</div>
                            <button 
                                type="button" 
                                onClick={handleGoogleSignIn}
                                disabled={isGoogleLoading}
                                className="btn bg-base-100 w-full text-black border-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#ece3ca"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
                                {isGoogleLoading ? "Signing in..." : "Login with Google"}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
            <ForgotPasswordModal modalId="forgot-password-modal" />
        </div>
    );
}

export function ForgotPasswordModal({ modalId }) {
    return (
        <>
            <dialog id={modalId} className="modal">
                <div className="modal-box">
                    {/* Close button form */}
                    <form method="dialog">
                        <button className="btn btn-sm btn-circle btn-ghost text-base-content absolute right-2 top-2">✕</button>
                    </form>
                    <h3 className={`text-center text-2xl sm:text-5xl font-didot text-base-content`}>Reset Password</h3>
                    {/* REMOVE the extra form here */}
                    <ForgotPasswordForm />
                </div>
            </dialog>
        </>
    );
}

function ForgotPasswordForm() {
    const auth = getAuth();
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const onSubmit = async (data) => {
        if (!data.email) return;

        setError(null);
        setSuccess(false);

        try {
            console.log(auth, data.email);
            const email = await sendPasswordResetEmail(auth, data.email);
            setSuccess(true);
            reset();
            // Password reset email sent!
        } catch (error) {
            const errorCode = error.code;
            const errorMessage = error.message;
            // Handle error
            setError('Failed to send reset email. Please check your email address.');
            console.error(error);
        }
    };

    return(
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col p-3 gap-4 min-w-80">
                <div className="space-y-1">
                    <label 
                        className="group input input-bordered flex items-center gap-2 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
                    >
                        <FontAwesomeIcon icon={faEnvelope} className='h-5 w-5'/>
                        <input 
                            type="email" 
                            {...register('email', { 
                                required: 'Email is required',
                                pattern: {
                                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                    message: "Invalid email address"
                                }
                            })}
                            placeholder="Email"
                            className={`grow text-base-content placeholder:text-base-content placeholder:font-didot`}
                        />
                    </label>
                    {errors.email && (
                        <p className="text-error-content text-sm">{errors.email.message}</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="p-2 rounded-md bg-success font-semibold text-lg text-success-content disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? "Sending..." : "Send Reset Email"}
                </button>

                {success && (
                    <p className="text-center text-success text-sm">Password reset email sent! Check your inbox.</p>
                )}
                {error && (
                    <p className="text-center text-error-content text-sm">{error}</p>
                )}
            </form>
        </>
    )
}

