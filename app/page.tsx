// import { Conversation } from './components/conversation';
import Onboarding from './components/onboarding'; // Changed to default import

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 sm:p-12 md:p-24 bg-black">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center text-white">
          Mirai
        </h1>
        <Onboarding />
      </div>
    </main>
  );
}
