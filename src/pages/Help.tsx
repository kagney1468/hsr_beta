import React, { useState } from 'react';

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
    question: "Why are you asking about heating, drainage or building works?",
    answer: "These are common questions that buyers and conveyancers ask during the property sales process. Providing them early can help avoid delays later."
  },
  {
    question: "What does “lease length remaining” mean?",
    answer: "If your property is leasehold, buyers will usually want to know how many years remain on the lease. This information is normally found in your lease document or title information."
  },
  {
    question: "Can I change the information later?",
    answer: "Yes. You can return to your account and update your property details or upload additional documents at any time."
  },
  {
    question: "Does this mean my property is ready to sell?",
    answer: "Home Sales Ready helps you prepare information and documents for your sale, but it does not replace professional advice from estate agents, surveyors or solicitors."
  }
];

export default function Help() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl w-full mx-auto p-6 md:p-10">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <span className="material-symbols-outlined text-primary text-3xl">help</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Help & FAQ</h1>
        <p className="text-slate-500 dark:text-slate-400">Find answers to common questions about Home Sales Ready.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all"
            >
              <button
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleAccordion(index)}
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100 pr-4">{faq.question}</span>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-5 pt-0 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 p-6 bg-primary/5 border border-primary/10 rounded-xl text-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Still need help?</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">If you couldn't find the answer you were looking for, our support team is here to help.</p>
        <a 
          href="mailto:hello@homesalesready.co.uk?subject=Home%20Sales%20Ready%20Support"
          className="inline-block px-6 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-md hover:bg-primary/90 transition-all"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
