import React from 'react';
import { Icons, Card, SectionTitle } from './ui';

interface FAQScreenProps {
  onBack: () => void;
}

export default function FAQScreen({ onBack }: FAQScreenProps) {
  
  const faqSections = [
    {
      title: "New Feature: \"Care Nearby\" Locator",
      icon: <Icons.Home className="w-6 h-6 text-emerald-600" />,
      color: "bg-emerald-50 text-emerald-700",
      items: [
        {
          q: "Can CareTransia help me find a nearby urgent care or pharmacy?",
          a: "Yes. CareTransia includes a \"Care Nearby\" feature that can show nearby urgent care centers, hospitals, pharmacies, and similar locations based on your area. It uses location information you provide (or your device, if you allow it) to list options with contact details and map links so you can reach them more easily."
        },
        {
          q: "Does CareTransia decide if I need urgent or emergency care?",
          a: "No. CareTransia does not decide how serious your situation is and does not provide triage. It only helps you find contact details and locations for nearby care. If you think you may be having a medical emergency, call your local emergency number or go to the nearest emergency department immediately."
        },
        {
          q: "How accurate are the locations and hours of nearby care centers?",
          a: "Location and hours information come from external services and may change over time. CareTransia shows the best available information, but you should always confirm phone numbers, addresses, and opening hours directly with the clinic, hospital, or pharmacy before you go."
        }
      ]
    },
    {
      title: "New Feature: Clinician → Caregiver Messaging",
      icon: <Icons.Note className="w-6 h-6 text-blue-600" />,
      color: "bg-blue-50 text-blue-700",
      items: [
        {
          q: "Can my doctor send me messages through CareTransia?",
          a: "Yes, if your clinician chooses to use this feature. CareTransia can display non-urgent messages from your care team, such as clarifications about instructions, reminders to schedule follow-up visits, or notes about your existing care plan. These messages appear in the \"Messages from your care team\" section of the app."
        },
        {
          q: "Is CareTransia like a live chat with my doctor?",
          a: "No. CareTransia messaging is not real-time chat and is not monitored continuously. It is meant for asynchronous updates and clarifications about your existing instructions. For urgent questions or emergencies, you should use your clinician’s official channels or call your local emergency number."
        },
        {
          q: "Can I reply directly to messages in CareTransia?",
          a: "CareTransia is designed mainly for one-way updates from your care team to you. You may see options such as \"Call clinic\" or links to your existing patient portal, but replying directly inside CareTransia is not intended to replace your provider’s official communication tools."
        },
        {
          q: "Can I use CareTransia messages in an emergency instead of calling 911?",
          a: "No. CareTransia messages are not suitable for emergencies and may not be seen immediately by your care team. If you think you might be having a medical emergency, do not use CareTransia. Call your local emergency number or go to the nearest emergency department right away."
        },
        {
          q: "What type of information will doctors send through CareTransia?",
          a: "Messages should focus on the care plan you already have, such as clarifying discharge instructions, reminding you about follow-up visits, or explaining medication details. Any new diagnoses or major treatment changes should be discussed directly with your clinician."
        }
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
       
       <div className="mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-4 font-semibold"
          >
             <Icons.ArrowRight className="w-4 h-4 rotate-180" /> Back to Settings
          </button>
          
          <SectionTitle 
            title="Frequently Asked Questions" 
            subtitle="Learn about new features and how CareTransia helps manage your recovery." 
          />
       </div>

       <div className="space-y-12">
          {faqSections.map((section, idx) => (
             <div key={idx} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className={`p-2 rounded-xl ${section.color}`}>
                        {section.icon}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                   {section.items.map((item, i) => (
                      <Card key={i} className="p-6 hover:shadow-md transition-shadow">
                         <h4 className="font-bold text-slate-900 text-lg mb-3 flex items-start gap-3">
                            <span className="text-blue-200 select-none">Q.</span>
                            {item.q}
                         </h4>
                         <p className="text-slate-600 leading-relaxed pl-7">
                            {item.a}
                         </p>
                      </Card>
                   ))}
                </div>
             </div>
          ))}

          {/* General Safety Warning Footer */}
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex gap-4 items-start">
              <Icons.Alert className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                  <h4 className="font-bold text-red-800 mb-1">Important Safety Notice</h4>
                  <p className="text-red-700 text-sm leading-relaxed">
                      CareTransia is an organizational tool, not a medical device. It does not provide medical diagnoses or emergency triage. 
                      If you believe you are having a medical emergency, please call 911 or your local emergency number immediately.
                  </p>
              </div>
          </div>
       </div>
    </div>
  );
}