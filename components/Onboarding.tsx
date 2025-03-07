"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    aboutYou: "",
    goals: "",
    idealSelf: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof typeof answers) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers({ ...answers, [field]: e.target.value });
  };

  const handleNext = () => {
    setStep(step + 1);
  };

  const handlePrev = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log("Submitting onboarding data:", answers);
      
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important for sending cookies
        body: JSON.stringify(answers),
      });
      
      const data = await response.json();
      console.log("Onboarding API response:", data);
      
      if (response.ok) {
        // Show success message
        alert("Your profile information has been saved!");
        router.push("/home");
      } else {
        console.error("Failed to save onboarding info:", data.error);
        alert("Error saving your information: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error saving onboarding data:", error);
      alert("Error connecting to server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center text-white">
      <div className="max-w-xl w-full px-4 py-8 bg-gray-900 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Welcome to Mirai</h1>
        <p className="text-center mb-8">
          Let's get to know you better so we can create your personalized experience
        </p>

        {step === 1 && (
          <div className="mb-6">
            <h2 className="text-xl mb-3">Tell us about yourself</h2>
            <p className="text-gray-400 mb-3">Share a bit about your background, interests, and personality.</p>
            <textarea
              className="w-full h-32 p-3 bg-gray-800 rounded-lg text-white"
              placeholder="I am..."
              value={answers.aboutYou}
              onChange={handleChange("aboutYou")}
              required
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleNext}
                disabled={!answers.aboutYou.trim()}
                className="px-6 py-2 bg-blue-600 rounded-full font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mb-6">
            <h2 className="text-xl mb-3">Tell us about a goal of yours</h2>
            <p className="text-gray-400 mb-3">What are you working towards? What would you like to achieve?</p>
            <textarea
              className="w-full h-32 p-3 bg-gray-800 rounded-lg text-white"
              placeholder="My goal is..."
              value={answers.goals}
              onChange={handleChange("goals")}
              required
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePrev}
                className="px-6 py-2 bg-gray-700 rounded-full font-semibold hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!answers.goals.trim()}
                className="px-6 py-2 bg-blue-600 rounded-full font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mb-6">
            <h2 className="text-xl mb-3">Tell us about your ideal self</h2>
            <p className="text-gray-400 mb-3">How would you describe the best version of yourself?</p>
            <textarea
              className="w-full h-32 p-3 bg-gray-800 rounded-lg text-white"
              placeholder="My ideal self is..."
              value={answers.idealSelf}
              onChange={handleChange("idealSelf")}
              required
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={handlePrev}
                className="px-6 py-2 bg-gray-700 rounded-full font-semibold hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!answers.idealSelf.trim() || isSubmitting}
                className="px-6 py-2 bg-green-600 rounded-full font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving..." : "Complete"}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            <div className={`h-2 w-8 rounded-full ${step === 1 ? "bg-blue-500" : "bg-gray-600"}`}></div>
            <div className={`h-2 w-8 rounded-full ${step === 2 ? "bg-blue-500" : "bg-gray-600"}`}></div>
            <div className={`h-2 w-8 rounded-full ${step === 3 ? "bg-blue-500" : "bg-gray-600"}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
} 