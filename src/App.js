import './App.css';
import Sidebar from './components/Sidebar'; // Sidebar import edildi
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import { useState, useEffect, useCallback } from 'react';
import { FiMenu, FiX } from 'react-icons/fi'; // Hamburger ve Kapatma ikonları

const LOCAL_STORAGE_SESSIONS_KEY = 'chatSessionsAnneAsistan';
const LOCAL_STORAGE_MESSAGES_PREFIX = 'chatMessagesAnneAsistan_';

function App() {
  const [chatSessions, setChatSessions] = useState(() => {
    const savedSessions = localStorage.getItem(LOCAL_STORAGE_SESSIONS_KEY);
    return savedSessions ? JSON.parse(savedSessions) : [];
  });
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSidebarOpenOnMobile, setIsSidebarOpenOnMobile] = useState(false);

  const removeEmojis = (text) => {
    if (!text) return '';
    return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}\s.,!?₺$%&()\\-]/gu, '');
  };

  const speakText = useCallback((text) => {
    if (window.speechSynthesis && text) {
      const cleanedText = removeEmojis(text);
      if (cleanedText.trim() === '') {
        console.warn("Emoji temizlendikten sonra seslendirilecek metin kalmadı.");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'tr-TR';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_SESSIONS_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    if (activeThreadId) {
      const savedMessages = localStorage.getItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${activeThreadId}`);
      setMessages(savedMessages ? JSON.parse(savedMessages) : []);
    } else {
      setMessages([]);
    }
  }, [activeThreadId]);

  useEffect(() => {
    if (activeThreadId && messages.length > 0) {
      localStorage.setItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${activeThreadId}`, JSON.stringify(messages));
    } else if (activeThreadId && messages.length === 0) {
      localStorage.removeItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${activeThreadId}`);
    }
  }, [messages, activeThreadId]);

  const createNewOpenAIThread = async () => {
    setIsLoading(true);
    try {
      console.log("[App.js] OpenAI'den yeni thread oluşturuluyor...");
      const response = await fetch('https://api.openai.com/v1/threads', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Yeni OpenAI thread oluşturulamadı.');
      }
      const newOpenAIThreadData = await response.json();
      console.log("[App.js] Yeni OpenAI thread oluşturuldu:", newOpenAIThreadData.id);
      return newOpenAIThreadData.id;
    } catch (error) {
      console.error('[App.js] OpenAI thread oluşturma hatası:', error);
      setMessages(prev => [...prev, { id: `err-openaithread-${Date.now()}`, sender: 'assistant', text: `OpenAI ile bağlantı kurulamadı: ${error.message}` }]);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = useCallback(async () => {
    const newOpenAIThreadId = await createNewOpenAIThread();
    if (newOpenAIThreadId) {
      const newChatSession = {
        id: `session-${Date.now()}`,
        title: `Yeni Sohbet ${chatSessions.length + 1}`,
        threadId: newOpenAIThreadId,
        createdAt: Date.now(),
      };
      setChatSessions(prevSessions => [newChatSession, ...prevSessions]);
      setActiveThreadId(newOpenAIThreadId);
      setMessages([{ id: 'initial-new', sender: 'assistant', text: 'Merhaba! Yeni sohbetimize hoş geldin.' }]);
      setIsSidebarOpenOnMobile(false); // Yeni sohbet seçildiğinde mobilde sidebar'ı kapat
    }
  }, [chatSessions.length]);

  const handleSelectChat = (threadIdToSelect) => {
    setActiveThreadId(threadIdToSelect);
    setIsSidebarOpenOnMobile(false); // Sohbet seçildiğinde mobilde sidebar'ı kapat
  };

  const handleRenameChat = (sessionId, newTitle) => {
    setChatSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === sessionId ? { ...session, title: newTitle } : session
      )
    );
  };

  const handleDeleteChat = (sessionIdToDelete, threadIdToDelete) => {
    console.log(`[App.js] Siliniyor: Session ID ${sessionIdToDelete}, Thread ID ${threadIdToDelete}`);
    localStorage.removeItem(`${LOCAL_STORAGE_MESSAGES_PREFIX}${threadIdToDelete}`);
    const updatedSessions = chatSessions.filter(session => session.id !== sessionIdToDelete);
    setChatSessions(updatedSessions);
    if (activeThreadId === threadIdToDelete) {
      if (updatedSessions.length > 0) {
        setActiveThreadId(updatedSessions[0].threadId); 
      } else {
        setActiveThreadId(null); 
        handleNewChat(); 
      }
    }
    setIsSidebarOpenOnMobile(false); // Sohbet silindiğinde mobilde sidebar'ı kapat
  };

  const processMessageWithThread = async (text, currentThreadId, assistantId, apiUrl) => {
    setIsLoading(true);
    const userMessage = { id: `user-${Date.now()}`, sender: 'user', text };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      const proxyResponse = await fetch(apiUrl, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          messageContent: text,
          assistantId: assistantId,
        }),
      });

      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        throw new Error(errorData.error?.message || 'Proxy sunucusundan yanıt alınamadı (sendMessage).');
      }
      const proxyData = await proxyResponse.json();
      const runId = proxyData.runId;

      let runStatus, statusData, attempts = 0;
      const maxAttempts = 20;

      do {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        if (attempts > maxAttempts) throw new Error("Run durumu kontrolü zaman aşımına uğradı.");

        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        });
        statusData = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusData.error?.message || 'Run durumu alınamadı');
        runStatus = statusData.status;
      } while (runStatus === 'queued' || runStatus === 'in_progress');

      if (runStatus === 'completed') {
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?run_id=${runId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        });
        const messagesData = await messagesResponse.json();
        if (!messagesResponse.ok) throw new Error(messagesData.error?.message || 'Mesajlar alınamadı');
        
        const assistantReply = messagesData.data
          .filter(msg => msg.role === 'assistant' && msg.run_id === runId)
          .sort((a, b) => a.created_at - b.created_at);

        if (assistantReply.length > 0 && assistantReply[0].content[0]?.type === 'text') {
          const assistantText = assistantReply[0].content[0].text.value;
          setMessages(prevMessages => [...prevMessages, { id: `asst-${Date.now()}`, sender: 'assistant', text: assistantText }]);
        } else {
           setMessages(prev => [...prev, { id: `warn-${Date.now()}`, sender: 'assistant', text: "Bir yanıt aldım ancak gösterilemiyor." }]);
        }
      } else {
        let userErrorMessage = `İşlem tamamlanamadı: ${runStatus}`;
        if (statusData?.last_error?.message) userErrorMessage += ` - ${statusData.last_error.message}`;
        else if (statusData?.incomplete_details?.reason) userErrorMessage += ` - Detay: ${statusData.incomplete_details.reason}`;
        setMessages(prev => [...prev, { id: `err-run-${Date.now()}`, sender: 'assistant', text: userErrorMessage }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: `err-proc-${Date.now()}`, sender: 'assistant', text: `Bir hata oluştu: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (text) => {
    if (!text.trim() || isLoading || !activeThreadId) {
      if(!activeThreadId) console.warn("Aktif sohbet (threadId) bulunamadı. Mesaj gönderilemiyor.");
      return;
    }
    const assistantIdFromEnv = process.env.REACT_APP_ASSISTANT_ID;
    const apiUrl = process.env.REACT_APP_API_URL; 
    if (!assistantIdFromEnv || !apiUrl) {
      setMessages(prev => [...prev, { id: `err-env-${Date.now()}`, sender: 'assistant', text: '.env dosyanızda API_URL veya ASSISTANT_ID eksik.' }]);
      return;
    }
    await processMessageWithThread(text, activeThreadId, assistantIdFromEnv, apiUrl);
  };

  const handleMicClick = () => {
    if (isLoading) return;
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      setMessages(prevMessages => [...prevMessages, { id: `err-${Date.now()}`, sender: 'assistant', text: "Üzgünüm, tarayıcınız sesle komut özelliğini desteklemiyor." }]);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setMessages(prevMessages => [...prevMessages, { id: `info-${Date.now()}`, sender: 'assistant', text: "Dinliyorum..." }]);
    recognition.onstart = () => { setIsListening(true); setIsLoading(true); };
    recognition.onspeechstart = () => console.log("Konuşma algılandı.");
    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setMessages(prevMessages => prevMessages.filter(msg => msg.text !== "Dinliyorum..."));
      handleSend(speechToText);
    };
    recognition.onspeechend = () => recognition.stop();
    recognition.onend = () => { setIsListening(false); setIsLoading(false); setMessages(prevMessages => prevMessages.filter(msg => msg.text !== "Dinliyorum...")); };
    recognition.onerror = (event) => {
      setIsListening(false); setIsLoading(false);
      let errorMessage = `Konuşma tanımada bir hata oluştu: ${event.error}`;
      if (event.error === 'no-speech') errorMessage = 'Ses algılanamadı.';
      else if (event.error === 'audio-capture') errorMessage = 'Mikrofon sorunu.';
      else if (event.error === 'not-allowed') errorMessage = 'Mikrofon izni yok.';
      setMessages(prevMessages => prevMessages.filter(msg => msg.text !== "Dinliyorum..."));
      setMessages(prevMessages => [...prevMessages, { id: `err-${Date.now()}`, sender: 'assistant', text: errorMessage }]);
    };
    recognition.start();
  };

  useEffect(() => {
    if (chatSessions.length === 0) {
      handleNewChat();
    } else if (!activeThreadId && chatSessions.length > 0) {
      const sortedSessions = [...chatSessions].sort((a,b) => b.createdAt - a.createdAt);
      setActiveThreadId(sortedSessions[0].threadId);
    }
  }, [chatSessions, activeThreadId, handleNewChat]);

  const toggleMobileSidebar = () => {
    setIsSidebarOpenOnMobile(!isSidebarOpenOnMobile);
  };

  return (
    <div className={`app-layout ${isSidebarOpenOnMobile ? 'sidebar-open-mobile' : ''}`}> 
      <Sidebar 
        chatSessions={chatSessions} 
        onNewChat={handleNewChat} 
        onSelectChat={handleSelectChat} 
        activeThreadId={activeThreadId}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
      />
      <div className="chat-area"> 
        <header className="app-header">
          <button className="hamburger-menu" onClick={toggleMobileSidebar}>
            {isSidebarOpenOnMobile ? <FiX size={24}/> : <FiMenu size={24}/>}
          </button>
          <h1>Dünyanın en iyi annesinin kişisel asistanı</h1>
        </header>
        <ChatWindow messages={messages} onSpeakText={speakText} isLoading={isLoading && messages[messages.length -1]?.sender === 'user'} />
        <MessageInput onSend={handleSend} onMicClick={handleMicClick} disabled={isLoading || !activeThreadId} isListening={isListening} />
      </div>
      {isSidebarOpenOnMobile && <div className="overlay" onClick={toggleMobileSidebar}></div>}
    </div>
  );
}

export default App;
