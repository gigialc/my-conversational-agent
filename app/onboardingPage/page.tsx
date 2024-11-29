// import { Conversation } from './components/conversation';
import Onboarding from '../components/onboarding'; // Changed to default import

export default function OnboardingPage() {
  return (

    <div className="flex min-h-screen flex-col items-center justify-between p-6 sm:p-12 md:p-24 bg-black">
      <Onboarding />

    </div>
  );
}
