import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

interface AuthResponse {
  success: boolean;
  message?: string;
  user: { id: string; email: string; first_name: string; last_name: string; avatar: string | null; };
  session: { id: string; expires_at: number; };
}

export default function Register() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    email: "", password: "", firstName: "", lastName: "", avatar: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch("https://readtalk.soeparnocorp.workers.dev/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });
      const data: AuthResponse = await response.json();
      if (!data.success) {
        setError(data.message || "Registration failed");
        return;
      }
      localStorage.setItem("session", data.session.id);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.location.href = "/overview";
    } catch (error) {
      setError("Failed to register");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({...prev, [name]: value }));
  };

  return (  
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950 px-4 py-8">
      {/* 2. HAPUS rounded-lg shadow-md. CUKUP w-full max-w-md */}
      <div className="w-full max-w-md bg-white dark:bg-zinc-950">
        <div>
          <h3 className="text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Register
          </h3>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            © 2026 SOEPARNO ENTERPRISE Corp.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Email Address </label>
              <input id="email" name="email" type="email" value={credentials.email} onChange={handleChange} required className="relative block w-full rounded-md border-0 p-1.5 text-gray-900 dark:text-white bg-transparent ring-1 ring-inset ring-gray-300 dark:ring-neutral-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#FF0000] sm:text-sm sm:leading-6" placeholder="Enter your email" />
            </div>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> First Name </label>
              <input id="firstName" name="firstName" type="text" value={credentials.firstName} onChange={handleChange} required className="relative block w-full rounded-md border-0 p-1.5 text-gray-900 dark:text-white bg-transparent ring-1 ring-inset ring-gray-300 dark:ring-neutral-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#FF0000] sm:text-sm sm:leading-6" placeholder="Enter your first name" />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Last Name </label>
              <input id="lastName" name="lastName" type="text" value={credentials.lastName} onChange={handleChange} required className="relative block w-full rounded-md border-0 p-1.5 text-gray-900 dark:text-white bg-transparent ring-1 ring-inset ring-gray-300 dark:ring-neutral-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#FF0000] sm:text-sm sm:leading-6" placeholder="Enter your last name" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Password </label>
              <input id="password" name="password" type="password" value={credentials.password} onChange={handleChange} required className="relative block w-full rounded-md border-0 p-1.5 text-gray-900 dark:text-white bg-transparent ring-1 ring-inset ring-gray-300 dark:ring-neutral-700 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-[#FF0000] sm:text-sm sm:leading-6" placeholder="Create a password" />
            </div>
          </div>
          {error && ( <div className="text-[#FF0000] text-sm text-center"> {error} </div> )}
          <div>            
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full h-12 items-center justify-center rounded-full bg-[#FF0000] px-3 py-2 text-base font-semibold text-white shadow-md transition active:scale-[0.98] hover:bg-[#CC0000] disabled:opacity-50"
            >
              {isLoading? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          <p> Already have an account?{" "}
            <a href="/login" className="font-medium text-[#FF0000] hover:text-[#CC0000]"> Sign in </a>
          </p>
        </div>
      </div>
    </div>
  );
}
