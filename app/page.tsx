// import { Conversation } from './components/conversation';
import LoginPage from './login/page'; // Changed to default import
import {signOut} from 'next-auth/react';


export default function IndexPage() {
  return (
      <LoginPage />

  );
}
