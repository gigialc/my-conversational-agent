# 🧘 **AI Personal Development Assistant**

Welcome to your **AI-Powered Personal Coach**! This assistant leverages advanced **AI voice cloning** technology to provide personalized daily affirmations that empower self-confidence, motivation, and mental wellbeing. 🧠💡  

---

## 🌟 **Features**

1. **Personalized Affirmations** 🎙️  
   - Tailored affirmations delivered in your own AI-generated voice.  
   - Crafted using **psychological principles** and positive framing.  

2. **Long-Term AI Memory** 📓  
   - Remembers your goals, challenges, and progress over time.  
   - Adapts affirmations dynamically based on voice note journaling.  

3. **AI Voice-Cloning** 🔊  
   - Voice synthesis through **ElevenLabs** to deliver affirmations in your own voice.  

4. **Database Integration** 🗃️  
   - Securely stores user preferences, voice IDs, and affirmation history in **MongoDB**.  

---

## 🛠️ **Tech Stack**

- ⚛️ **Next.js** for frontend, API routes, and backend logic  
- 🤖 **Vapi** for conversational AI integration  
- 🔊 **ElevenLabs** for voice synthesis and cloning  
- 🗃️ **MongoDB** for storing user data and assistant history  

---

## 📦 **Environment Variables**  
**Add the following environment variables to your `.env.local` file:**

```bash
# MongoDB Connection String
MONGO_URI=

# NextAuth Secrets (for Authentication)
TOKEN_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Vapi Server Webhook
NEXT_PUBLIC_SERVER_URL=https://your-vapi-webhook-url/api/webhook

---

## ⚙️ **Setup Instructions**

**1. Clone the repository**
git clone https://github.com/gigialc/my-conversational-agent.git
cd my-conversational-agent

**2. Install dependencies**
npm install

**3. Add environment variables**
Create a .env.local file in the root directory and add the necessary variables.

**4. Start the development server**
npm run dev

**5. Open the app**
Visit http://localhost:3000 to experience your personalized AI assistant.

---

## 🎯 **How It Works**

**1. Initial Setup**
- Record your sample audio to clone your voice.
- Enter your goals and challenges to personalize the experience.

**2. Daily Affirmations**
- Receive affirmations tailored to your goals in your own AI-generated voice.
- Affirmations adapt based on your voice note feedback.

**3. Voice Note Journaling**
- Share your thoughts and progress through voice notes.
- The assistant learns from your feedback to keep affirmations relevant.

**4. Backed by Psychology**
- Affirmations leverage self-affirmation theory and neuroplasticity principles
  to rewire negative thought patterns into positive habits.

## ❤️ **Credits**
Developed by Georgina Alcaraz ✨

