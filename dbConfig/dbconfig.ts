import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();  // Load environment variables from .env file

export async function connectToMongoDB() {
    try {
        const uri = process.env.MONGO_URI;
        
        if (!uri) {
            throw new Error('MONGO_URI is not defined');
        }

		mongoose.connect(uri, { });  // Removed useNewUrlParser and useUnifiedTopology
        const connection = mongoose.connection;

        connection.on('connected', () => {
            console.log('Great! MongoDb is connected girl!');
        });

        connection.on('error', (err) => {
            console.log('MongoDB connected ERROR. ' + err);
            process.exit();
        });
    } catch (error) {
        console.log('Ups! Something went wrong! ' + error);
    }
}
