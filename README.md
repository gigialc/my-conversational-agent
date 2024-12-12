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

Add the following environment variables to your `.env.local` file:

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

```bash
# 1. Clone the repository
git clone https://github.com/gigialc/my-conversational-agent.git
cd my-conversational-agent

# 2. Install dependencies
npm install

# 3. Add environment variables
# Create a .env.local file in the root directory and add the necessary variables.

# 4. Start the development server
npm run dev

# 5. Open the app
# Visit http://localhost:3000 to experience your personalized AI assistant.

---

## ❤️ **Credits**

```bash
AI Voice Cloning    : ElevenLabs 🔊
Conversational Memory: Vapi 🤖
Database            : MongoDB 🗃️
Developed by        : Georgina Alcaraz ✨ 
