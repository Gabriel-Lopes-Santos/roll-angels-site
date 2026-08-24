import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Trash2, Pi, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const SUPABASE_URL = 'https://zpcpcydqutomotjybuge.supabase.co';

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Saudações, aventureiro. Eu sou π no Kyo, Protótipo 314159265 — um automata da escola de conjuração. Estou aqui para auxiliá-lo com informações sobre a campanha e mecânicas de D&D 5e. Como posso ajudá-lo?',
  id: 'init'
};

const formatMarkdown = (text) => {
  if (!text) return null;
  
  const blocks = text.split('\n\n');
  
  return blocks.map((block, i) => {
    // Code blocks
    if (block.startsWith('```') && block.endsWith('```')) {
      const code = block.slice(3, -3).trim();
      return (
        <pre key={i} className="bg-zinc-950 p-2 rounded-md my-2 overflow-x-auto text-sm font-mono text-zinc-300 border border-zinc-800">
          <code>{code}</code>
        </pre>
      );
    }
    
    // Inline formatting
    let formatted = block;
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Inline code
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-zinc-700/50 px-1.5 py-0.5 rounded text-emerald-400 font-mono text-sm">$1</code>');
    
    // Newlines within paragraph
    formatted = formatted.replace(/\n/g, '<br />');

    return (
      <p key={i} className="mb-2 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />
    );
  });
};

export default function PiNoKyoChat({ role = 'dm', sheetId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleClear = () => {
    setMessages([INITIAL_MESSAGE]);
    setError(null);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    const newUserMsg = { role: 'user', content: userMessage, id: Date.now().toString() };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { role: 'assistant', content: '', id: assistantId }]);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/campaign-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages
            .filter(m => m.id !== 'init')
            .map(({role, content}) => ({role, content}))
            .slice(-10),
          role,
          sheetId: sheetId || null,
        }),
      });

      if (!response.ok) {
        let errMessage = `Erro: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch(e) {}
        throw new Error(errMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              let textChunk = data;
              if (data.startsWith('"') && data.endsWith('"')) {
                  textChunk = JSON.parse(data);
              }
              fullAssistantMessage += textChunk;
            } catch(e) {
              fullAssistantMessage += data;
            }
            
            setMessages(prev => prev.map(msg => 
              msg.id === assistantId ? { ...msg, content: fullAssistantMessage } : msg
            ));
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'A magia falhou. Não foi possível conectar ao constructo.');
      setMessages(prev => prev.filter(m => m.content !== '' || m.role !== 'assistant'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Chat Panel */}
      <div 
        className={`transition-all duration-300 ease-in-out transform origin-bottom-right ${
          isOpen 
            ? 'scale-100 opacity-100 translate-y-0 mb-4' 
            : 'scale-95 opacity-0 translate-y-10 pointer-events-none absolute'
        }`}
      >
        <div className="w-[400px] h-[500px] bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-900/50 text-emerald-400 rounded-lg border border-emerald-800/50">
                <Pi size={20} />
              </div>
              <div>
                <h3 className="text-zinc-100 font-semibold leading-tight">π no Kyo</h3>
                <p className="text-emerald-500/80 text-xs">Assistente Arcano</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleClear}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Limpar Conversa"
              >
                <Trash2 size={16} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Pi size={14} className="text-emerald-500" />
                  </div>
                )}
                
                <div 
                  className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-700/50 text-zinc-100 rounded-tr-sm border border-emerald-600/30' 
                      : 'bg-zinc-800 text-zinc-300 rounded-tl-sm border border-zinc-700/50'
                  }`}
                >
                  {msg.role === 'assistant' ? formatMarkdown(msg.content) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Pi size={14} className="text-emerald-500" />
                </div>
                <div className="bg-zinc-800 rounded-xl rounded-tl-sm px-4 py-3 border border-zinc-700/50 flex space-x-1 items-center">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-zinc-950 border-t border-zinc-800">
            <form onSubmit={handleSend} className="relative flex items-center">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Consulte os arcanos..."
                disabled={isLoading}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-3 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none disabled:opacity-50"
                rows="1"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
          
        </div>
      </div>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative group flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
          isOpen ? 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-600' : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-emerald-500 blur opacity-40 group-hover:opacity-60 transition-opacity animate-pulse" />
        )}
        
        <div className="relative z-10 text-white">
          {isOpen ? <X size={24} /> : <Sparkles size={24} />}
        </div>
      </button>

    </div>
  );
}
