/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OrderStatus } from '../types';
import { 
  ClipboardCheck, 
  Package, 
  Truck, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface OrderTrackingStepperProps {
  status: OrderStatus;
}

export default function OrderTrackingStepper({ status }: OrderTrackingStepperProps) {
  const steps = [
    { key: 'pending', label: 'المراجعة', icon: ClipboardCheck },
    { key: 'processing', label: 'التجهيز', icon: Package },
    { key: 'shipping', label: 'الشحن', icon: Truck },
    { key: 'delivered', label: 'تم التسليم', icon: CheckCircle2 }
  ];

  const getStatusIndex = (s: OrderStatus) => {
    if (s === 'pending') return 0;
    if (s === 'processing') return 1;
    if (s === 'shipping') return 2;
    if (s === 'delivered' || s === 'completed') return 3;
    return -1;
  };

  const currentIndex = getStatusIndex(status);

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600">
        <AlertCircle className="h-5 w-5" />
        <span className="text-xs font-black">عذراً، تم إلغاء هذا الطلب ❌</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Connector Line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 -z-10" />
      <div 
        className="absolute top-5 left-0 right-0 h-0.5 bg-amber-500 transition-all duration-1000 origin-right -z-10" 
        style={{ 
          width: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : '0%' 
        }} 
      />

      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${
                isActive 
                  ? 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-500/10' 
                  : isCompleted 
                    ? 'bg-amber-500 text-white border-amber-500' 
                    : 'bg-white text-slate-300 border-slate-50'
              }`}>
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={`text-[10px] font-black ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
