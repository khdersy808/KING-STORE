import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Camera, Upload, Send, Loader2, Sparkles, Crown } from 'lucide-react';
import { db, storage, collection, addDoc, ref, uploadString, getDownloadURL } from '../lib/firebase';
import { User } from '../types';

interface CustomRequestFormProps {
  currentUser: User | null;
  onShowToast: (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error') => void;
  openAuthModal: () => void;
}

export const CustomRequestForm: React.FC<CustomRequestFormProps> = ({
  currentUser,
  onShowToast,
  openAuthModal
}) => {
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onShowToast('خطأ', 'حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onShowToast('تنبيه', 'يرجى تسجيل الدخول أولاً لتتمكن من إرسال طلبك الملكي 👑', 'info');
      openAuthModal();
      return;
    }

    if (!description.trim()) {
      onShowToast('خطأ', 'يرجى كتابة وصف للمنتج الذي تبحث عنه.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (image) {
        const storageRef = ref(storage, `custom_requests/${currentUser.id}_${Date.now()}`);
        await uploadString(storageRef, image, 'data_url');
        imageUrl = await getDownloadURL(storageRef);
      }

      const requestData = {
        userId: currentUser.id,
        userName: currentUser.name,
        userEmail: currentUser.email,
        description,
        imageUrl,
        timestamp: new Date().toISOString(),
        status: 'قيد المراجعة'
      };

      await addDoc(collection(db, 'custom_requests'), requestData);

      // Notification to Admin
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        customerEmail: 'khdersy080@gmail.com', // Primary target
        title: '👑 طلب منتج خاص جديد!',
        message: `ملكنا خادر، هناك زبون (${currentUser.name}) طلب منتجاً خاصاً جديداً! اضغط للمراجعة`,
        date: new Date().toISOString(),
        isRead: false,
        type: 'system'
      });

      // Also notify khdersy808@gmail.com if it's the main admin account used in rules
      await addDoc(collection(db, 'notifications'), {
        userId: 'admin',
        customerEmail: 'khdersy808@gmail.com',
        title: '👑 طلب منتج خاص جديد!',
        message: `ملكنا خادر، هناك زبون (${currentUser.name}) طلب منتجاً خاصاً جديداً! اضغط للمراجعة`,
        date: new Date().toISOString(),
        isRead: false,
        type: 'system'
      });

      onShowToast('نجاح', 'تم إرسال طلبك بنجاح! سيتواصل معك فريقنا الملكي قريباً ✨', 'success');
      setDescription('');
      setImage(null);
    } catch (err) {
      console.error('Error submitting custom request:', err);
      onShowToast('خطأ', 'فشل إرسال الطلب. يرجى المحاولة لاحقاً.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto my-8 overflow-hidden"
    >
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 border border-amber-500/30 shadow-2xl overflow-hidden group">
        {/* Royal Accents */}
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Crown className="w-24 h-24 text-amber-400 rotate-12" />
        </div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              لم تجد ما تبحث عنه؟ اطلبه الآن وتدلل! 👑
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-amber-200/80 mr-1 block">
                وصف المنتج (المقاس، اللون، التفاصيل)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اكتب هنا تفاصيل المنتج الذي تحلم به..."
                className="w-full min-h-[120px] p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-auto">
                <label className="relative flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold rounded-xl cursor-pointer transition-all active:scale-95 shadow-lg shadow-amber-500/20">
                  <Upload className="w-5 h-5" />
                  <span>رفع صورة المنتج</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {image && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-500/50 group/img">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-indigo-950 font-extrabold text-lg rounded-xl shadow-xl shadow-amber-900/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>جاري الإرسال...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>إرسال الطلب الملكي</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
