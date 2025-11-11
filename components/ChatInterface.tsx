
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  placeholder: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading, placeholder }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-white">
        {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-2 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-brand-accent text-white rounded-br-none'
                    : 'bg-slate-100 text-brand-primary rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
        ))}
         {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start">
                <div className="max-w-xs md:max-w-md lg:max-w-2xl px-4 py-2 rounded-2xl bg-slate-100 text-brand-primary rounded-bl-none">
                  <TypingIndicator />
                </div>
            </div>
         )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-slate-200 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 w-full px-4 py-2 bg-slate-100 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-accent text-brand-primary"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-brand-accent text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;