import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Sparkles, Send, Loader2, CheckCircle, RefreshCcw, AlertCircle, Package } from 'lucide-react';
import { Product } from '../types';
import { db, doc, updateDoc } from '../lib/firebase';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

interface AIImageLabProps {
  products: Product[];
  onShowToast: (title: string, msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function AIImageLab({ products, onShowToast }: AIImageLabProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [originalImageBase64, setOriginalImageBase64] = useState<string>('');
  const [editedImageBase64, setEditedImageBase64] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [processingError, setProcessingError] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onShowToast('خطأ', 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImageBase64(reader.result as string);
        setEditedImageBase64(''); // Reset edited image
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImage = async () => {
    if (!originalImageBase64) {
      onShowToast('تنبيه', 'الرجاء رفع صورة أولاً', 'info');
      return;
    }
    if (!prompt) {
      onShowToast('تنبيه', 'الرجاء إدخال وصف للتعديلات المطلوبة', 'info');
      return;
    }

    setIsProcessing(true);
    setProcessingError('');
    try {
      const res = await fetch('/api/gemini/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageBase64: originalImageBase64
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت عملية التعديل');
      }

      setEditedImageBase64(data.image);
      onShowToast('نجاح', 'تم معالجة الصورة بنجاح بواسطة الذكاء الاصطناعي', 'success');
    } catch (err: any) {
      console.error(err);
      setProcessingError(err.message || 'حدث خطأ أثناء معالجة الصورة');
      onShowToast('خطأ', err.message || 'حدث خطأ أثناء معالجة الصورة', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!editedImageBase64 || !selectedProductId) {
      onShowToast('تنبيه', 'يجب تحديد منتج ومعالجة الصورة أولاً', 'info');
      return;
    }

    setIsPublishing(true);
    try {
      // 1. Upload to Firebase Storage
      const storage = getStorage();
      const imageRef = ref(storage, `products/ai_${Date.now()}.png`);
      const snapshot = await uploadString(imageRef, editedImageBase64, 'data_url');
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Update Firestore
      await updateDoc(doc(db, 'products', selectedProductId), {
        imageUrl: downloadURL
      });

      onShowToast('نجاح', 'تم تحديث صورة المنتج ونشرها بنجاح 🚀', 'success');
      
      // Reset after success
      setOriginalImageBase64('');
      setEditedImageBase64('');
      setPrompt('');
      setSelectedProductId('');
    } catch (err: any) {
      console.error(err);
      onShowToast('خطأ', 'حدث خطأ أثناء نشر الصورة', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 border border-amber-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-wide">معمل الصور الملكي <span className="text-amber-500">AI</span></h2>
              <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
                ارفع صورة منتجك التجريبية، واكتب التعليمات التي تريدها. سيقوم الذكاء الاصطناعي من جوجل بتحسين وتعديل الصورة فوراً لتناسب هوية متجرك الفخمة.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              تحديد المنتج المراد تحديث صورته
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-3 transition-colors"
            >
              <option value="">-- اختر المنتج --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-amber-500" />
              رفع الصورة التجريبية (Original Image)
            </label>
            <div 
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-amber-500 transition-colors cursor-pointer group bg-slate-50"
              onClick={() => fileInputRef.current?.click()}
            >
              {originalImageBase64 ? (
                <div className="relative rounded-xl overflow-hidden shadow-inner border border-slate-200 bg-white">
                  <img src={originalImageBase64} alt="Original" className="w-full h-48 object-contain" />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-bold text-sm bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700 ">تغيير الصورة</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                  <div className="p-4 bg-white rounded-full shadow-sm border border-slate-200 group-hover:scale-110 transition-transform">
                    <ImageIcon className="h-8 w-8 text-slate-400 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <div className="text-slate-500 text-sm">
                    <span className="text-amber-600 font-bold">اضغط هنا</span> لرفع صورة المنتج
                  </div>
                  <p className="text-xs text-slate-400">يدعم PNG, JPG (الحد الأقصى 5MB)</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              توجيهات التعديل (Prompt)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="مثال: قم بتحسين الإضاءة واجعل الخلفية رمادية فخمة تليق بمتجر ملكي..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-amber-500 focus:border-amber-500 block p-4 transition-colors min-h-[120px] resize-none"
            />

            <button
              onClick={handleEditImage}
              disabled={isProcessing || !originalImageBase64 || !prompt}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري المعالجة السحرية...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  توليد الصورة المعدلة
                </>
              )}
            </button>
          </div>

        </div>

        {/* Results Column */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <ImageIcon className="h-5 w-5 text-amber-500" />
              النتيجة النهائية (AI Result)
            </h3>
            
            <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-4">
              {isProcessing ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                    <Sparkles className="h-16 w-16 text-amber-500 animate-bounce relative z-10" />
                  </div>
                  <p className="text-slate-600 font-bold animate-pulse">جاري دمج الفخامة مع صورتك...</p>
                </div>
              ) : processingError ? (
                <div className="text-center p-6 space-y-4 max-w-md">
                  <div className="p-4 bg-red-50 text-red-500 rounded-full w-16 h-16 flex items-center justify-center mx-auto border border-red-200">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <h4 className="text-sm font-bold text-red-600">فشلت عملية التعديل بالذكاء الاصطناعي</h4>
                  <p className="text-xs text-slate-500 leading-relaxed bg-red-50/50 border border-red-100 p-3 rounded-xl font-mono">
                    {processingError}
                  </p>
                  <p className="text-xs text-slate-400">
                    يرجى التحقق من تفعيل وربط مفتاح الـ API الخاص بك من نافذة الإعدادات (Settings &gt; Secrets) في منصة AI Studio.
                  </p>
                </div>
              ) : editedImageBase64 ? (
                <div className="w-full h-full flex flex-col">
                  <div className="relative flex-1 rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white">
                    <img src={editedImageBase64} alt="Edited AI Result" className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : originalImageBase64 ? (
                <div className="w-full h-full flex flex-col">
                  <div className="relative flex-1 rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white">
                    <img src={originalImageBase64} alt="Original Preview" className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-center space-y-3">
                  <ImageIcon className="h-12 w-12 mx-auto opacity-20" />
                  <p>الرجاء رفع صورة للمنتج للبدء بالتعديل والمعاينة المباشرة 👑</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {editedImageBase64 && (
              <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                <button
                  onClick={() => setEditedImageBase64('')}
                  className="flex-1 bg-white text-slate-700 px-6 py-4 rounded-xl font-bold hover:bg-slate-50 transition-colors border border-slate-200 flex items-center justify-center gap-2"
                >
                  <RefreshCcw className="h-5 w-5" />
                  إلغاء وإعادة المحاولة
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !selectedProductId}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-4 rounded-xl font-black hover:shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5" />
                  )}
                  {isPublishing ? 'جاري النشر...' : 'اعتماد ونشر للمنتج المحدد'}
                </button>
              </div>
            )}
            
            {editedImageBase64 && !selectedProductId && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium">
                  الرجاء اختيار المنتج من القائمة الجانبية لتتمكن من تحديث صورته واعتماد النتيجة.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

