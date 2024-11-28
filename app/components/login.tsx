// //login component
// import React, { useState } from 'react';
// import { useAuth } from '@11labs/react';
// import { useRouter } from 'next/router';
// import { useForm } from 'react-hook-form';
// import { yupResolver } from '@hookform/resolvers/yup';

// import { loginSchema } from '../utils/validation';

// export function Login() {
//   const { login } = useAuth();
//   const router = useRouter();
//   const [error, setError] = useState('');
//   const {
//     register,
//     handleSubmit,
//     formState: { errors },
//   } = useForm({
//     resolver: yupResolver(loginSchema),
//   });

//   async function onSubmit(data) {
//     try {
//       await login(data);
//       router.push('/');
//     } catch (error) {
//       setError('Failed to login');
//     }
//   }

//   return (
//     <div className="flex flex-col items-center gap-4 p-6">
//       <h1 className="text-3xl font-bold">Login</h1>
//       <form
//         onSubmit={handleSubmit(onSubmit)}
//         className="flex flex-col gap-4 w-full max-w-md"
//       >
//         <input
//           type="email"
//           placeholder="Email"
//           {...register('email')}
//           className="p-2 border border-gray-300 rounded-lg"
//         />
//         {errors.email && (
//           <p className="text-red-500">{errors.email.message}</p>
//         )}
//         <input
//           type="password"
//           placeholder="Password"
//           {...register('password')}
//           className="p-2 border border-gray-300 rounded-lg"
//         />
//         {errors.password && (
//           <p className="text-red-500">{errors.password.message}</p>
//         )}
//         {error && <p className="text-red-500">{error}</p>}
//         <button
//           type="submit"
//           className="px-6 py-2 bg-pink-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
//         >
//           Login
//         </button>
//       </form>
//     </div>
//   );
// }
