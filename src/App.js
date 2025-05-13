import './App.css';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import { useState, useEffect } from 'react'; // useEffect eklendi

function App() {
  const [messages, setMessages] = useState([
    { sender: 'assistant', text: 'Merhaba! Size nasıl yardımcı olabilirim?' }
  ]);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Yüklenme durumu için state

  // İsteğe bağlı: Assistant'ı API ile oluşturmak için bir fonksiyon.
  // Genellikle Assistant'lar önceden oluşturulur ve ID'leri kullanılır.
  // eslint-disable-next-line no-unused-vars
  const getOrCreateAssistant = async () => {
    // Bu fonksiyonu kullanacaksanız, ASSISTANT_ID'yi dinamik olarak ayarlamanız gerekir.
    try {
      const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          name: "Anne Asistanı",
          instructions: "Sen 55 yaşında bir annenin kişisel asistanısın. Nazik, sade Türkçe konuşuyorsun. Dua, tarif ve moral verici cümlelerle yanıt veriyorsun.",
          model: "gpt-4o",
        }),
      });
      const assistantData = await assistantResponse.json();
      if (!assistantResponse.ok) {
          console.error("Asistan oluşturulamadı:", assistantData);
          throw new Error("Asistan oluşturulamadı");
      }
      console.log("Asistan oluşturuldu/getirildi:", assistantData.id);
      return assistantData.id;
    } catch (error) {
      console.error("getOrCreateAssistant hatası:", error);
      // Hata durumunda kullanıcıya bilgi verilebilir
      setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: 'Asistan yapılandırmasında bir sorun oluştu.' }]);
      return null;
    }
  };


  useEffect(() => {
    // Uygulama ilk yüklendiğinde yeni bir thread oluştur
    const createThread = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2',
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error?.message || 'Thread oluşturulamadı');
        }
        setThreadId(data.id);
      } catch (error) {
        console.error('Thread oluşturma hatası:', error);
        setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: `Konuşma başlatılamadı: ${error.message}` }]);
      } finally {
        setIsLoading(false);
      }
    };
    if (!threadId) {
      createThread();
    }
  }, [threadId]); // threadId değiştiğinde değil, sadece başlangıçta çalışması için. Ancak bağımlılık olarak kalmalı.

  const handleSend = async (text) => {
    if (!text.trim() || isLoading) return;

    const assistantIdFromEnv = process.env.REACT_APP_ASSISTANT_ID; // Frontend .env'den
    // const apiKeyFromEnv = process.env.REACT_APP_OPENAI_API_KEY; // Artık frontendde API key'e doğrudan ihtiyaç yok

    console.log("Assistant ID from .env:", assistantIdFromEnv);

    if (!assistantIdFromEnv) {
      setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: 'Lütfen .env dosyanızda geçerli bir REACT_APP_ASSISTANT_ID tanımlayın.' }]);
      return;
    }

    if (!threadId) {
      setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: 'Konuşma (thread) henüz hazır değil, lütfen biraz bekleyin.' }]);
      return;
    }

    setIsLoading(true);
    const userMessage = { sender: 'user', text };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      // Proxy API'sine istek yap
      const proxyResponse = await fetch('/api/sendMessage', { // Vercel'de bu path çalışacaktır
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId: threadId,
          messageContent: text,
          assistantId: assistantIdFromEnv,
        }),
      });

      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        console.error('Proxy API Hatası:', errorData);
        throw new Error(errorData.error || 'Proxy sunucusundan yanıt alınamadı.');
      }

      const proxyData = await proxyResponse.json();
      const runId = proxyData.runId;

      // Run durumunu kontrol etme ve mesajları alma (Bu kısımlar aynı kalabilir veya proxy'ye taşınabilir)
      let runStatus;
      let statusData;
      do {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`, // Bu GET isteği için hala key gerekebilir
            'OpenAI-Beta': 'assistants=v2',
          },
        });
        statusData = await statusResponse.json();
        if (!statusResponse.ok) {
          console.error("Run durumu alınırken API hatası:", statusData);
          throw new Error(statusData.error?.message || 'Run durumu alınamadı');
        }
        runStatus = statusData.status;
      } while (runStatus === 'queued' || runStatus === 'in_progress');

      if (runStatus === 'completed') {
        const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`, // Bu GET isteği için hala key gerekebilir
            'OpenAI-Beta': 'assistants=v2',
          },
        });
        const messagesData = await messagesResponse.json();
        if (!messagesResponse.ok) {
          throw new Error(messagesData.error?.message || 'Mesajlar alınamadı');
        }

        const assistantReply = messagesData.data
          .filter(msg => msg.role === 'assistant' && msg.run_id === runId)
          .sort((a, b) => b.created_at - a.created_at);

        if (assistantReply.length > 0 && assistantReply[0].content[0].type === 'text') {
          const assistantText = assistantReply[0].content[0].text.value;
          setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: assistantText }]);
          const utterance = new SpeechSynthesisUtterance(assistantText);
          utterance.lang = 'tr-TR';
          window.speechSynthesis.speak(utterance);
        } else {
          console.warn("Run tamamlandı ancak asistan mesajı bulunamadı veya formatı beklenmiyor.", assistantReply);
        }
      } else {
        console.error('Run tamamlanamadı. Durum:', runStatus, 'Detaylar:', statusData);
        let userErrorMessage = `İşlem tamamlanamadı: ${runStatus}`;
        if (statusData && statusData.last_error && statusData.last_error.message) {
          userErrorMessage += ` - ${statusData.last_error.message}`;
        }
        setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: userErrorMessage }]);
      }
    } catch (error) {
      console.error('handleSend hatası:', error);
      setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: `Bir hata oluştu: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicClick = () => {
    if (isLoading) return;
    // Speech-to-Text (Web Speech API)
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false; // Sadece kesin sonuçları al
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      handleSend(speechToText); // Tanınan metni doğrudan gönder
    };

    recognition.onspeechend = () => {
      recognition.stop();
    };

    recognition.onerror = (event) => {
      console.error('Konuşma tanıma hatası:', event.error);
      let errorMessage = 'Konuşma tanımada bir hata oluştu.';
      if (event.error === 'no-speech') {
        errorMessage = 'Ses algılanamadı. Lütfen tekrar deneyin.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'Mikrofon erişiminde bir sorun var.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Mikrofon erişimine izin verilmedi.';
      }
      setMessages(prevMessages => [...prevMessages, { sender: 'assistant', text: errorMessage }]);
    };
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Dünyanın en iyi annesinin kişisel asistanı</h1>
      </header>
      <ChatWindow messages={messages} />
      <MessageInput onSend={handleSend} onMicClick={handleMicClick} disabled={isLoading} />
    </div>
  );
}

export default App;
