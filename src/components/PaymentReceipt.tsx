import React, { useState } from 'react';
import { ShieldCheck, Calendar, User, ArrowDownRight, Copy, Check, QrCode, CreditCard, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Order, PaymentGateway } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useCurrency } from '../contexts/CurrencyContext';

interface PaymentReceiptProps {
  order: Order;
  gateway?: PaymentGateway;
  onPrint?: () => void;
}

export default function PaymentReceipt({ order, gateway, onPrint }: PaymentReceiptProps) {
  const { t, dir, language } = useLanguage();
  const { formatPrice } = useCurrency();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const locale = language === 'ar' ? 'ar-EG' : 'en-US';
  const formattedDate = new Date(order.date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const senderName = order.paymentDetails?.senderName || order.senderName || order.customerName;
  const transactionId = order.paymentDetails?.transactionId || order.transactionId || order.id.replace('ORD-', '');
  const gatewayName = order.paymentDetails?.gatewayName || gateway?.name || t('customGateway');
  const recipientAccount = gateway?.accountIdentifier || t('officialAccount');

  // Determine status styles and texts
  let statusText = '';
  let statusColorClass = '';
  let statusBgClass = '';
  let StatusIcon = Clock;

  if (order.status === 'completed') {
    statusText = t('orderAcceptedStatus').replace('{gateway}', gatewayName);
    statusColorClass = 'text-emerald-400';
    statusBgClass = 'bg-emerald-500/10 border-emerald-500/20';
    StatusIcon = CheckCircle2;
  } else if (order.status === 'cancelled') {
    statusText = t('orderRejectedStatus');
    statusColorClass = 'text-red-400';
    statusBgClass = 'bg-red-500/10 border-red-500/20';
    StatusIcon = XCircle;
  } else {
    statusText = t('orderPendingStatus').replace('{gateway}', gatewayName);
    statusColorClass = 'text-amber-400';
    statusBgClass = 'bg-amber-500/10 border-amber-500/20';
    StatusIcon = Clock;
  }

  return (
    <div 
      className="w-full max-w-md mx-auto bg-slate-950 border border-amber-500/20 rounded-3xl shadow-2xl overflow-hidden text-white font-sans relative"
      dir={dir}
      id={`receipt-${order.id}`}
    >
      {/* Golden Highlight Border top */}
      <div className={`h-1.5 w-full bg-gradient-to-${dir === 'rtl' ? 'l' : 'r'} from-amber-600 via-amber-400 to-amber-600`}></div>

      {/* Background Decorative Rings */}
      <div className={`absolute top-0 ${dir === 'rtl' ? 'right-0 -mr-16' : 'left-0 -ml-16'} w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -mt-16 pointer-events-none`}></div>
      <div className={`absolute bottom-0 ${dir === 'rtl' ? 'left-0 -ml-16' : 'right-0 -mr-16'} w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -mb-16 pointer-events-none`}></div>

      {/* Main Content */}
      <div className="p-6 space-y-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center space-y-2 border-b border-white/5 pb-4">
          <div className="inline-flex items-center justify-center bg-amber-500/10 border border-amber-500/30 rounded-full p-2.5 mb-1 text-amber-400 animate-pulse">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h4 className="text-lg font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>{t('royalPaymentNotice')}</span>
            <span className="text-amber-400 font-extrabold text-xs bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-500/20">KING STORE</span>
          </h4>
          <p className="text-[10px] text-slate-400">{t('officialReceiptDesc')}</p>
        </div>

        {/* Amount Badge */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center relative overflow-hidden">
          <div className={`absolute top-0 ${dir === 'rtl' ? 'left-0' : 'right-0'} w-2 h-full bg-amber-500`}></div>
          <span className="block text-[10px] text-slate-400 font-bold mb-1">{t('netAmount')}</span>
          <div className="flex flex-col items-center gap-1.5">
            <div className="text-2xl font-black text-amber-400 tracking-tight font-mono flex items-center justify-center gap-1.5">
              <span>{formatPrice(order.totalAmount)}</span>
            </div>
          </div>

          {order.payment_type === 'split_50_50' && (
            <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-2 text-right">
              <div className="bg-slate-900/50 p-2 rounded-lg border border-emerald-500/10">
                <span className="block text-[8px] text-emerald-400 font-bold">عربون 50% (مدفوع الآن):</span>
                <span className="text-[11px] font-black text-emerald-400 font-mono">{formatPrice(order.amount_paid_advance || (order.totalAmount * 0.5))}</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded-lg border border-amber-500/10">
                <span className="block text-[8px] text-amber-400 font-bold">المتبقي 50% (عند الاستلام):</span>
                <span className="text-[11px] font-black text-amber-400 font-mono">{formatPrice(order.amount_due_on_delivery || (order.totalAmount * 0.5))}</span>
              </div>
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="space-y-3.5 text-xs">
          
          {/* Status Section */}
          <div className={`p-3 rounded-xl border ${statusBgClass} flex items-start gap-2.5`}>
            <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${statusColorClass}`} />
            <div className="space-y-0.5">
              <span className="block text-[9px] text-slate-400 font-bold">{t('currentTransferStatus')}</span>
              <span className={`text-[11px] font-bold ${statusColorClass} leading-relaxed block`}>
                {statusText}
              </span>
            </div>
          </div>

          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-3">
            
            {/* Transaction ID */}
            <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
              <span className="text-slate-400">{t('transactionIdLabelReceipt')}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white font-mono select-all text-[11px]">{transactionId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(transactionId, 'txid')}
                  className="text-amber-400 hover:text-amber-300 p-1 hover:bg-white/5 rounded transition-all"
                  title={t('copyTxId')}
                >
                  {copiedField === 'txid' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
              <span className="text-slate-400">{t('dateTimeLabel')}</span>
              <span className="font-bold text-slate-200 text-[10px]">{formattedDate}</span>
            </div>

            {/* Sender Name */}
            <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
              <span className="text-slate-400">{t('senderNameLabelReceipt')}</span>
              <span className="font-black text-amber-400 select-all">{senderName}</span>
            </div>

            {order.paymentDetails?.phoneNumber && (
              <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
                <span className="text-slate-400">{t('phone')}</span>
                <span className="font-extrabold text-white font-mono select-all text-[11px]">{order.paymentDetails.phoneNumber}</span>
              </div>
            )}

            {/* Recipient Store */}
            <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
              <span className="text-slate-400">{t('financialRecipient')}</span>
              <span className="font-bold text-white">KING STORE 👑</span>
            </div>

            {/* Recipient Account */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">{t('targetAccount')}</span>
              <span className={`font-medium text-slate-200 text-[10px] ${dir === 'rtl' ? 'text-left' : 'text-right'} truncate max-w-[180px] font-mono select-all`} title={recipientAccount}>
                {recipientAccount}
              </span>
            </div>

          </div>

          {/* Items Summary list */}
          <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 space-y-2">
            <span className="block text-[10px] text-slate-400 font-bold border-b border-white/[0.03] pb-1.5">{t('itemsInInvoice')}</span>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold font-mono">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-slate-200">{item.productName}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono font-bold text-slate-400">{formatPrice(item.price * item.quantity)}</span>

                </div>
              </div>
            ))}
            {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/[0.03]">
                <span className="text-slate-400">تكلفة خدمة التوصيل والشحن الدولي:</span>
                <span className="font-mono font-bold text-amber-400">+{formatPrice(order.deliveryFee)}</span>
              </div>
            )}
            {order.import_tax !== undefined && order.import_tax > 0 && (
              <div className={`flex items-center justify-between text-[11px] ${!(order.deliveryFee !== undefined && order.deliveryFee > 0) ? 'pt-1.5 border-t border-white/[0.03]' : ''}`}>
                <span className="text-slate-400">الرسوم الجمركية وضريبة الاستيراد (10%):</span>
                <span className="font-mono font-bold text-amber-400">+{formatPrice(order.import_tax)}</span>
              </div>
            )}
          </div>

        </div>

        {/* Dashed Separator */}
        <div className="relative my-4">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/10"></div>
          <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} ${dir === 'rtl' ? '-translate-x-1/2' : 'translate-x-1/2'} top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-r border-amber-500/20`}></div>
          <div className={`absolute ${dir === 'rtl' ? 'right-0' : 'left-0'} ${dir === 'rtl' ? 'translate-x-1/2' : '-translate-x-1/2'} top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-900 rounded-full border-l border-amber-500/20`}></div>
        </div>

        {/* Footer info & Stamp */}
        <div className="flex flex-col items-center justify-center space-y-3 pt-1">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 select-none">
            <QrCode className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{t('unifiedOrderId')} <strong className="font-mono text-white select-all">{order.id}</strong></span>
          </div>

          {/* Stamp Graphic */}
          <div className="border border-amber-500/30 bg-amber-500/[0.03] px-3.5 py-1.5 rounded-xl border-dashed rotate-2 text-center text-amber-400/90 font-black tracking-widest text-[9px] uppercase shadow-sm select-none">
            KING STORE PAID APPROVED ★
          </div>
          
          <p className="text-[9px] text-slate-500 leading-relaxed text-center">
            {t('receiptDisclaimer')}
          </p>
        </div>

      </div>
    </div>
  );
}
