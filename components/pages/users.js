'use client'

import { Suspense, useState } from "react";
import Link from "next/link";

import { useForm } from 'react-hook-form';

import { useAggressiveAuth } from '@/lib/firebase/auth-hooks';
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useServerAuth, useAuthenticatedApi } from '@/lib/firebase/auth-hooks';

import { RequireAuth } from '@/components/auth/require-auth';
import { AccountDataState } from '@/components/auth/account-data-state';
import { AddUserModal } from '@/components/general/add-user';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@awesome.me/kit-237330da78/icons/classic/regular';

export function Users({ data }) {
    return (
        <RequireAuth>
            <AccountDataState data={data}>
                <UsersContent key={JSON.stringify([data.userId, data.users])} initialUsers={data.users}/>
            </AccountDataState>
        </RequireAuth>
    );
}

function UsersContent({ initialUsers }) {
    const [users, setUsers] = useState(initialUsers);
    // Remount when refreshed server data changes, while preserving local add/delete updates.

    return(
        <RequireAuth>
            <div className="w-full h-fit min-h-screen pr-5 pt-3">
                <div className='flex justify-end items-center w-full'>
                    <Link href='/partners/dashboard' className='btn btn-ghost text-base-content'>Dashboard</Link>
                </div>
                <div className="flex flex-col justify-start items-center gap-5 w-full h-fit p-10">
                    <UsersTable users={users} setUsers={setUsers}/>
                </div>
            </div>
            <AddUserModal modalId='add-user-modal' users={users} setUsers={setUsers}/>
        </RequireAuth>
    )
}

function UsersTable({users, setUsers}) {
    const { user: userAuth } = useAggressiveAuth()
    const { serverTenant } = useServerAuth();
    const makeAuthenticatedRequest = useAuthenticatedApi();

    const handleDeleteUser = async (userId) => {
        if (confirm('Are you sure you want to delete this user?')) {
            try {
                await makeAuthenticatedRequest(
                    `/api/${serverTenant.id}/users/delete-user`,
                    {
                        method: 'DELETE',
                        body: JSON.stringify({ userId })
                    }
                );
                // Refresh the users list locally
                setUsers(users.filter(u => u.email !== userId));
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    return(
        <div className="card w-full bg-base-100 card-lg shadow-sm">
            <div className="card-body">
                <h2 className={`card-title text-3xl sm:text-4xl lg:text-5xl font-didot text-base-content text-center sm:text-left`}>Users</h2>
                <div className="overflow-x-auto">
                    <table className="table min-w-full">
                        {/* head */}
                        <thead className='text-base-content'>
                            <tr>
                                <th className="min-w-[100px] sm:min-w-[120px]">First Name</th>
                                <th className="min-w-[100px] sm:min-w-[120px]">Last Name</th>
                                <th className="min-w-[150px] sm:min-w-[200px]">Email</th>
                                <th className="min-w-[100px] sm:min-w-[120px]">Password</th>
                                <th className="min-w-[60px] sm:min-w-[80px]">Remove</th>
                            </tr>
                        </thead>
                        <tbody className='text-base-content'>
                            {
                                users && users.map((user, index) => (
                                    <tr key={index} className="hover:bg-base-200">
                                        <td className="text-xs sm:text-sm">{user.first_name}</td>
                                        <td className="text-xs sm:text-sm">{user.last_name}</td>
                                        <td className="text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[200px]">{user.email}</td>
                                        <td><RecetPasswordBtn auth={userAuth} user={user}/></td>
                                        <td><button className='btn btn-error btn-xs sm:btn-sm' onClick={() => handleDeleteUser(user.email)} disabled={userAuth?.email == user.email ? 'disabled' : ''}>X</button></td>
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    <div className='flex justify-center items-center w-full mt-5'>
                        <button
                            onClick={()=>document.getElementById('add-user-modal').showModal()}
                            className="badge badge-outline badge-info text-xs sm:text-sm"
                        >
                            Add New User
                        </button>
                    </div>
                </div>
            </div>
            <ResetPasswordModal modalId='reset-password-modal'/>
        </div>
    )
}

function RecetPasswordBtn({auth, user}) {
    if (!auth?.email) {
        return(
            <h6 className="text-xs sm:text-sm">-------------</h6>
        )
    }

    if (auth?.email == user.email) {
        return(
            <Suspense loading={<h6 className="text-xs sm:text-sm">Loading...</h6>}>
                <button
                    onClick={()=>document.getElementById('reset-password-modal').showModal()}
                    className="btn btn-link text-base-content text-xs sm:text-sm"
                >
                    Reset Password
                </button>
            </Suspense>
        )
    }

    return
}

export function ResetPasswordModal({ modalId, users , setUsers}) {
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
                    <ResetPasswordForm />
                </div>
            </dialog>
        </>
    );
}

function ResetPasswordForm() {
    const auth = getAuth();
    const { register, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = useForm();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);

    const password = watch("password");
    const currentPassword = watch("currentPassword");

    const onSubmit = async (data) => {
        if (!data.password || !data.currentPassword) return;

        setError(null);
        setSuccess(false);

        try {
            if (auth.currentUser) {
                // First, re-authenticate the user
                const credential = EmailAuthProvider.credential(
                    auth.currentUser.email,
                    data.currentPassword
                );

                await reauthenticateWithCredential(auth.currentUser, credential);

                // Then update the password
                await updatePassword(auth.currentUser, data.password);
                setSuccess(true);
                reset();
                setTimeout(() => {
                    document.getElementById('reset-password-modal').close();
                }, 2000);
            } else {
                setError('No user is currently signed in.');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            if (error.code === 'auth/wrong-password') {
                setError('Current password is incorrect.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else {
                setError('Failed to update password. Please try again.');
            }
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
                            type="password"
                            {...register('currentPassword', { 
                                required: 'Current password is required'
                            })}
                            placeholder="Current Password"
                            className={`grow text-base-content placeholder:text-base-content placeholder:font-didot`}
                        />
                    </label>
                    {errors.currentPassword && (
                        <p className="text-error-content text-sm">{errors.currentPassword.message}</p>
                    )}
                </div>

                <div className="space-y-1">
                    <label 
                        className="group input input-bordered flex items-center gap-2 font-serif text-base-content border border-indigo-900 bg-opacity-0 bg-black rounded-xl shadow-sm has-[:focus]:bg-opacity-20 hover:bg-opacity-20 hover:shadow-md transition-all duration-200"
                    >
                        <FontAwesomeIcon icon={faEnvelope} className='h-5 w-5'/>
                        <input 
                            type="password"
                            {...register('password', { 
                                required: 'New password is required',
                                minLength: {
                                    value: 6,
                                    message: "Password must be at least 6 characters"
                                }
                            })}
                            placeholder="New Password"
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
                            {...register('confirmPassword', {
                                required: 'Please confirm your new password',
                                validate: value => value === password || "Passwords do not match"
                            })}
                            placeholder="Confirm New Password"
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
                    {isSubmitting ? "Updating..." : "Update Password"}
                </button>

                {success && (
                    <p className="text-center text-success text-sm">Password updated successfully!</p>
                )}
                {error && (
                    <p className="text-center text-error-content text-sm">{error}</p>
                )}
            </form>
        </>
    )
}
