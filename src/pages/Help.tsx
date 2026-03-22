import React, { useState } from 'react';
import { Card } from '../components/ui/Card';

const faqs = [
  {
    question: "What is Home Sales Ready?",
    answer: "Home Sales Ready is a digital dataroom that helps you prepare the key information and documents about your property before it goes on the market. By gathering everything in one place early, you can reduce delays later in the sales process and make it easier for agents, buyers, solicitors etc to understand your property."
  },
  {
    question: "Why are you asking for this information?",
    answer: "Estate agents, buyers and conveyancers typically ask for much of this information during the sales process. Providing it early helps ensure that nothing important is missed and allows your property details to be more complete from the start."
  },
  {
    question: "Do I need to complete everything?",
    answer: "No. You can save your information as a draft and return later. However, the more information you provide, the more useful your Home Sales Ready report will be."
  },
  {
    question: "What if I don’t have a document?",
    answer: "That’s completely normal. Many sellers don’t have every document available immediately. You can upload documents later or leave sections blank for now."
  },
  {
    question: "Who can see my information?",
    answer: "Your information is stored securely and is only accessible to you unless you choose to share it with your estate agent or another party."
  },
  {
    question: "Why are you asking about utilities or building works?",
    answer: "These are common questions that buyers and conveyancers ask during the property sales process. Providing them early can help avoid delays later."
  }
];

export default function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black font-heading text-white tracking-tight">Help & FAQ</h1>
        <p className="text-zinc-400">Find answers to common questions about your property pack.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <Card 
              key={index} 
              className={`p-0 border-white/5 bg-zinc-900 overflow-hidden transition-all duration-300 ${isOpen ? 'ring-1 ring-[#00e5a0]/30 shadow-xl shadow-[#00e5a0]/5' : ''}`}
            >
              <button
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-white/[0.02] transition-colors"
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className="font-bold text-white text-base pr-4">{faq.question}</span>
                <span className={`material-symbols-outlined text-[#00e5a0] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}
              >
                <div className="px-6 pb-6 text-zinc-400 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-8 border-white/5 bg-zinc-900 text-center space-y-4 shadow-2xl">
        <div className="size-12 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-2xl mx-auto">
           <span className="material-symbols-outlined">mail</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Still need help?</h3>
          <p className="text-zinc-500 text-sm">Our support team is available Mon-Fri, 9am - 5pm.</p>
        </div>
        <a 
          href="mailto:support@homesalesready.com"
          className="inline-block px-8 py-3 bg-[#00e5a0] text-black font-black font-heading rounded-xl shadow-lg shadow-[#00e5a0]/20 hover:scale-[1.02] transition-all"
        >
          Contact Support
        </a>
      </Card>
    </div>
  );
}
