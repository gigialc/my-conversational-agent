import mongoose from "mongoose";

const onboardingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    questions: { type: Array, required: true },
    answers: { type: Array, required: true },
});

const Onboarding = mongoose.models.Onboarding || mongoose.model("Onboarding", onboardingSchema);

export default Onboarding;
