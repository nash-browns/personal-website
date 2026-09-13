'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useForm } from 'react-hook-form'
import { addIncomingRequest } from '@/lib/server-actions/firebase/firestore'

import { 
    faSignature,
    faPhone,
    faEnvelope,
} from '@awesome.me/kit-237330da78/icons/classic/regular'

export function ContactUs() {
    const [isSubmitted, setIsSubmitted] = useState(false)
    
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset
    } = useForm({
        mode: 'onBlur'
    })

    const onSubmit = async (data) => {
        try {
            // Submit to Firestore
            await addIncomingRequest({
                email: data.email,
                first_name: data.firstName,
                last_name: data.lastName,
                message: data.message,
                phone: data.phone || '',
                type: 'work_with_us',
                site: 'nash_browns'
            })
            
            // Reset form and show success message
            reset()
            setIsSubmitted(true)
        } catch {
            alert('Error sending message. Please try again.')
        }
    }

    const getInputClassName = (fieldName) => {
        const baseClasses = "grow text-base-content placeholder:text-base-content placeholder:font-didot"
        return errors[fieldName] ? `${baseClasses} border-red-500` : baseClasses
    }

    const getLabelClassName = (fieldName) => {
        const baseClasses = "group input input-bordered flex items-center gap-2 font-serif text-base-content border bg-opacity-10 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
        return errors[fieldName] ? `${baseClasses} border-red-500` : `${baseClasses} border-indigo-900`
    }

    return (
        <div className="mx-auto w-full md:p-10 py-5 md:py-0">
            <h2 className={`text-center text-2xl sm:text-6xl font-didot text-base-content`}>Work With Us</h2>
            
            {isSubmitted ? (
                // Thank you message
                <div className="w-full mt-2 sm:mt-5 text-center">
                    <div className="bg-opacity-10 bg-green-500 border border-green-600 rounded-xl p-8 sm:p-12">
                        <h3 className="text-2xl sm:text-4xl font-didot text-base-content mb-4">Thank You!</h3>
                        <p className="text-lg sm:text-xl font-serif text-base-content">
                            We will contact you shortly.
                        </p>
                    </div>
                </div>
            ) : (
                // Contact form
                <form onSubmit={handleSubmit(onSubmit)} className="w-full mt-2 sm:mt-5">
                <div className="flex flex-col gap-5 w-full">
                    <div className="flex flex-col md:flex-row gap-3 w-full">
                        <div className="w-full md:w-1/2">
                            <label className={`${getLabelClassName('firstName')} w-full`}>
                                <FontAwesomeIcon icon={faSignature} className='h-5 w-5'/>
                                <input 
                                    type="text" 
                                    placeholder="First Name" 
                                    className={getInputClassName('firstName')}
                                    {...register('firstName', { 
                                        required: 'First name is required',
                                        minLength: {
                                            value: 2,
                                            message: 'First name must be at least 2 characters'
                                        }
                                    })}
                                />
                            </label>
                            {errors.firstName && (
                                <p className="text-red-500 text-sm mt-1 font-serif">{errors.firstName.message}</p>
                            )}
                        </div>
                        <div className="w-full md:w-1/2">
                            <label className={`${getLabelClassName('lastName')} w-full`}>
                                <FontAwesomeIcon icon={faSignature} className='h-5 w-5'/>
                                <input 
                                    type="text" 
                                    placeholder="Last Name" 
                                    className={getInputClassName('lastName')}
                                    {...register('lastName', { 
                                        required: 'Last name is required',
                                        minLength: {
                                            value: 2,
                                            message: 'Last name must be at least 2 characters'
                                        }
                                    })}
                                />
                            </label>
                            {errors.lastName && (
                                <p className="text-red-500 text-sm mt-1 font-serif">{errors.lastName.message}</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className={getLabelClassName('email')}>
                            <FontAwesomeIcon icon={faEnvelope} className='h-5 w-5'/>
                            <input 
                                type="email" 
                                placeholder="Email"
                                className={getInputClassName('email')}
                                {...register('email', { 
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: 'Invalid email address'
                                    }
                                })}
                            />
                        </label>
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1 font-serif">{errors.email.message}</p>
                        )}
                    </div>
                    <div>
                        <label className={getLabelClassName('phone')}>
                            <FontAwesomeIcon icon={faPhone} className='h-5 w-5'/>
                            <input 
                                type="tel" 
                                placeholder="Phone"
                                className={getInputClassName('phone')}
                                {...register('phone', { 
                                    pattern: {
                                        value: /^[\+]?[1-9][\d]{0,15}$/,
                                        message: 'Invalid phone number'
                                    }
                                })}
                            />
                        </label>
                        {errors.phone && (
                            <p className="text-red-500 text-sm mt-1 font-serif">{errors.phone.message}</p>
                        )}
                    </div>
                    <div>
                        <textarea
                            placeholder="Hey Nash! We would love to partner up on a upcoming project!!"
                            className={`w-full min-h-32 p-3 font-serif text-base-content border bg-opacity-10 bg-black rounded-xl shadow-sm focus:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200 placeholder:text-base-content placeholder:font-didot ${
                                errors.message ? 'border-red-500' : 'border-indigo-900'
                            }`}
                            {...register('message', { 
                                required: 'Message is required',
                                minLength: {
                                    value: 10,
                                    message: 'Message must be at least 10 characters'
                                }
                            })}
                        />
                        {errors.message && (
                            <p className="text-red-500 text-sm mt-1 font-serif">{errors.message.message}</p>
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center items-center">
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 w-full font-serif text-base-content border border-indigo-900 bg-opacity-10 bg-black rounded-xl shadow-sm hover:bg-opacity-20 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </div>
            </form>
            )}
        </div>
    );
}
