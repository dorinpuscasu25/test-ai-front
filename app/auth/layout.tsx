import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication - Interview Simulator",
  description: "Login or register to access your interview simulator",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:flex bg-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-white p-8">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-primary"
              >
                <path d="M12 2c1.7 0 3.3.2 4.6.7 1.2.4 2.2 1 2.8 1.8.7.7 1.1 1.6 1.1 2.5s-.4 1.8-1.1 2.5c-.7.7-1.6 1.3-2.8 1.8-1.3.4-2.9.7-4.6.7s-3.3-.2-4.6-.7c-1.2-.4-2.2-1-2.8-1.8-.7-.7-1.1-1.6-1.1-2.5s.4-1.8 1.1-2.5c.7-.7 1.6-1.3 2.8-1.8 1.3-.4 2.9-.7 4.6-.7z" />
                <path d="M8.8 15.2A13.5 13.5 0 0 0 12 16a13.5 13.5 0 0 0 3.2-.8" />
                <path d="M21.9 9.8c.1.8.1 1.8.1 2.8 0 2.6-.4 5-1.2 6.9a9.3 9.3 0 0 1-3.2 4.2c-1.3.9-2.8 1.3-4.3 1.3-1.7 0-3.3-.5-4.6-1.5-1.2-1-2.2-2.4-2.9-4.1-.6-1.7-1-3.8-1-6" />
                <path d="M7.1 8.5A13.8 13.8 0 0 0 5.5 12c0 1.7.3 3.2 1 4.4.6 1.2 1.4 2.1 2.3 2.7.9.6 1.8.9 2.8.9 2.1 0 4-1.5 5.2-4" />
              </svg>
              <h1 className="text-2xl font-bold">InterviewAI</h1>
            </div>
            <p className="mt-2 text-gray-400">Perfect your interview skills with AI</p>
          </div>
          <div className="space-y-6 max-w-md">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Elevate Your Interview Skills
            </h2>
            <p className="text-gray-400">
              Practice with our AI-powered interview simulator and receive real-time feedback
              to help you prepare for your next job opportunity.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="glass-card p-4">
                <div className="text-xl font-bold text-white mb-1">500+</div>
                <div className="text-sm text-gray-400">Interview questions</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-xl font-bold text-white mb-1">92%</div>
                <div className="text-sm text-gray-400">Success rate</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-xl font-bold text-white mb-1">24/7</div>
                <div className="text-sm text-gray-400">Available anytime</div>
              </div>
              <div className="glass-card p-4">
                <div className="text-xl font-bold text-white mb-1">12+</div>
                <div className="text-sm text-gray-400">Job industries</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-black to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="glass-card p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}