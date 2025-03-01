import axios from 'axios';
import FormData from 'form-data';

// Helper function to determine if we're in a Node.js environment
const isNodeEnvironment = () => {
  const isNode = typeof process !== 'undefined' && 
         process.versions != null && 
         process.versions.node != null;
  console.log('🔍 Environment check:', isNode ? 'Node.js' : 'Browser');
  return isNode;
};

// Helper function to create appropriate FormData and headers
const createFormDataAndHeaders = (content: string, filename: string) => {
  console.log(`🔧 Creating FormData for file: ${filename}, content length: ${content.length}`);
  
  if (isNodeEnvironment()) {
    // Server-side (Node.js)
    console.log('📦 Using Node.js FormData implementation');
    try {
      const formData = new FormData();
      formData.append('file', Buffer.from(content), {
        filename,
        contentType: 'text/plain',
      });
      
      console.log('✅ Node.js FormData created successfully');
      return {
        formData,
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          ...formData.getHeaders()
        }
      };
    } catch (error) {
      console.error('❌ Error creating Node.js FormData:', error);
      throw error;
    }
  } else {
    // Client-side (browser)
    console.log('🌐 Using Browser FormData implementation');
    try {
      const formData = new globalThis.FormData();
      const blob = new Blob([content], { type: 'text/plain' });
      formData.append('file', blob, filename);
      
      console.log('✅ Browser FormData created successfully');
      return {
        formData,
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
        }
      };
    } catch (error) {
      console.error('❌ Error creating Browser FormData:', error);
      throw error;
    }
  }
};

const checkApiKey = () => {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    console.error('❌ VAPI_API_KEY is not set in environment variables');
    return false;
  }
  
  console.log(`✅ VAPI_API_KEY is set (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...)`);
  return true;
};

export const vapiKnowledgeBase = {
  async createKnowledgeBase(name: string, content: string) {
    console.log('🆕 Creating KB:', { name, contentLength: content.length });
    try {
      // Create FormData with appropriate handling for Node.js or browser
      console.log('📋 Preparing to create FormData for KB creation');
      const { formData, headers } = createFormDataAndHeaders(content, 'conversation.txt');
      console.log('📋 FormData created with headers:', Object.keys(headers));

      // First, create a file with the conversation content
      console.log('📤 Uploading file to Vapi API');
      const fileResponse = await axios.post('https://api.vapi.ai/file', 
        formData,
        { headers }
      );
      console.log('📄 File created:', fileResponse.data);

      const fileId = fileResponse.data.id;
      console.log('🆔 File ID:', fileId);

      // Create knowledge base with the file
      console.log('🏗️ Creating knowledge base with file ID:', fileId);
      const kbResponse = await axios.post('https://api.vapi.ai/knowledge-base', {
        name,
        provider: "trieve",
        searchPlan: {
          searchType: "semantic",
          topK: 3,
          removeStopWords: true,
          scoreThreshold: 0.7
        },
        createPlan: {
          type: "create",
          chunkPlans: [{
            fileIds: [fileId],
            targetSplitsPerChunk: 50,
            splitDelimiters: [".!?\n"],
            rebalanceChunks: true
          }]
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Knowledge base created successfully:', kbResponse.data);
      return kbResponse.data;
    } catch (error) {
      console.error('❌ Error creating KB:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name,
        contentLength: content.length
      });
      throw error;
    }
  },

  async updateAssistantWithKB(assistantId: string, knowledgeBaseId: string) {
    try {
      console.log(`Updating assistant ${assistantId} with KB ${knowledgeBaseId}`);
      
      // First get the current assistant configuration
      const getResponse = await axios.get(`https://api.vapi.ai/assistant/${assistantId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
        }
      });
      
      const currentConfig = getResponse.data;
      console.log('Current assistant config:', JSON.stringify(currentConfig, null, 2));
      
      // Update only the model configuration with the knowledge base
      const response = await axios.patch(`https://api.vapi.ai/assistant/${assistantId}`, {
        model: {
          provider: currentConfig.model.provider,
          model: currentConfig.model.model,
          temperature: currentConfig.model.temperature || 0.7,
          maxTokens: currentConfig.model.maxTokens || 250,
          knowledgeBase: { id: knowledgeBaseId }
        }
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Assistant update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating assistant with knowledge base:', error);
      throw error;
    }
  },

  async appendToKnowledgeBase(knowledgeBaseId: string, content: string) {
    try {
      console.log('📝 Adding new document to existing KB:', knowledgeBaseId);
      console.log('📊 Content length:', content.length);
      
      // Create FormData with appropriate handling for Node.js or browser
      console.log('📋 Preparing to create FormData for file upload');
      const { formData, headers } = createFormDataAndHeaders(
        content, 
        `conversation-${Date.now()}.txt`
      );
      console.log('📋 FormData created with headers:', Object.keys(headers));

      // Upload the file
      console.log('📤 Uploading file to Vapi API');
      const fileResponse = await axios.post('https://api.vapi.ai/file', 
        formData,
        { headers }
      );
      
      console.log('📄 File uploaded successfully:', fileResponse.data.id);

      // Add the file to the existing knowledge base - use the files endpoint directly
      console.log('🔄 Adding file to knowledge base directly');
      
      // Try the direct files/add endpoint first (newer API)
      try {
        const response = await axios.post(`https://api.vapi.ai/knowledge-base/${knowledgeBaseId}/files`, {
          fileIds: [fileResponse.data.id],
          targetSplitsPerChunk: 50,
          splitDelimiters: [".!?\n"],
          rebalanceChunks: true
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ File added to KB successfully using direct files endpoint');
        return response.data;
      } catch (addError: unknown) {
        const error = addError as any;
        console.error('❌ Error with direct file add:', error.response?.data);
        
        // If that fails, try creating a new knowledge base instead
        console.log('🔄 Creating new knowledge base as fallback');
        const newKbName = `User_${knowledgeBaseId.split('_')[1]}_KB_${Date.now()}`;
        const newKbResponse = await this.createKnowledgeBase(newKbName, content);
        return newKbResponse;
      }
    } catch (error) {
      console.error('❌ Error in knowledge base operation:', error);
      throw error;
    }
  },

  async getKnowledgeBaseId(userId: string) {
    try {
      console.log(`[KB-FIND] Looking for knowledge base for user ID: ${userId}`);
      if (!checkApiKey()) {
        console.error('[KB-FIND] Cannot get knowledge base ID: API key not set');
        return null;
      }
      
      console.log('[KB-FIND] Requesting knowledge bases from Vapi API');
      const response = await axios.get('https://api.vapi.ai/knowledge-base', {
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_API_KEY}`
        }
      });
      
      console.log(`[KB-FIND] Retrieved ${response.data.length} knowledge bases`);
      console.log(`[KB-FIND] Looking for knowledge base named: User_${userId}_KB`);
      
      const kbNames = response.data.map((kb: any) => kb.name);
      console.log(`[KB-FIND] Available KB names: ${JSON.stringify(kbNames)}`);
      
      const userKB = response.data.find((kb: any) => kb.name === `User_${userId}_KB`);
      
      if (userKB) {
        console.log(`[KB-FIND] Found knowledge base with ID: ${userKB.id}`);
      } else {
        console.log(`[KB-FIND] No matching knowledge base found for user: ${userId}`);
      }
      
      return userKB ? userKB.id : null;
    } catch (error) {
      console.error('[KB-FIND] Error getting knowledge base ID:', error);
      return null;
    }
  },
};