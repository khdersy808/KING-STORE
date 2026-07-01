/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, PaymentGateway, Order } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'هاتف ذكي فاخر K-Phone 15 Ultra',
    description: 'أقوى هاتف ذكي في فئته بكاميرا بدقة 200 ميجابكسل، ومعالج فائق السرعة، وشاشة سوبر أموليد 120 هرتز مع تصميم خارجي من التيتانيوم.',
    price: 1199,
    type: 'physical',
    category: 'إلكترونيات',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
    stock: 12,
    reviews: [
      {
        id: 'rev-1',
        reviewerName: 'سلطان العتيبي',
        reviewerEmail: 'ahmed.otb@example.com', // matches first order's customerEmail partially for verification feel!
        rating: 5,
        comment: 'الهاتف مذهل بكل ما تعنيه الكلمة! الكاميرا 200 ميجابكسل فائقة الوضوح والسرعة خارقة وتصميم التيتانيوم غاية في الأناقة.',
        date: '2026-06-20T10:00:00Z'
      },
      {
        id: 'rev-2',
        reviewerName: 'خالد الحربي',
        reviewerEmail: 'khaled@example.com',
        rating: 4,
        comment: 'هاتف ممتاز جداً وتصميم التيتانيوم رائع، الشاشة مريحة للعين ومعدل الهرتز عالي جداً. لكن السعر مرتفع قليلاً.',
        date: '2026-06-22T14:30:00Z'
      }
    ]
  },
  {
    id: 'p2',
    name: 'ساعة ذكية رياضية King Chrono V2',
    description: 'مقاومة للماء بالكامل، تتبع نبضات القلب، قياس الأكسجين، وبطارية تدوم لـ 14 يوماً متواصلة مع شاشة AMOLED باللمس.',
    price: 249,
    type: 'physical',
    category: 'ساعات ذكية',
    imageUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=80',
    stock: 25,
    reviews: [
      {
        id: 'rev-3',
        reviewerName: 'سارة القحطاني',
        reviewerEmail: 'sara@example.com',
        rating: 5,
        comment: 'الساعة أنيقة جداً والبطارية ممتازة تدوم لأكثر من أسبوعين كما هو معلن. تتبع الأنشطة الرياضية دقيق للغاية.',
        date: '2026-06-18T08:15:00Z'
      }
    ]
  },
  {
    id: 'p3',
    name: 'سماعات رأس لاسلكية مخصصة King Sound Pro',
    description: 'سماعات عازلة للضوضاء الخارجي بالكامل، صوت نقي ثلاثي الأبعاد، وسائد أذن مريحة من رغوة الذاكرة، وبطارية تشحن سريعا.',
    price: 189,
    type: 'physical',
    category: 'إلكترونيات',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
    stock: 18
  },
  {
    id: 'p4',
    name: 'سترة هودي قطنية مطرزة بالثقافة الملكية',
    description: 'سترة شتوية مصنوعة من القطن العضوي 100٪ مع تطريز ذهبي فاخر وتصميم عصري يوفر الدفء والأناقة الفائقة.',
    price: 79,
    type: 'physical',
    category: 'ملابس',
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80',
    stock: 30
  },
  {
    id: 'p5',
    name: 'مفتاح تفعيل أصلي Windows 11 Pro',
    description: 'ترخيص أصلي 100٪ مدى الحياة لجهاز واحد. يدعم اللغات كافة والتحديثات الرسمية من مايكروسوفت. يرسل كود التفعيل فوراً بعد الدفع.',
    price: 29,
    type: 'digital',
    category: 'برمجيات',
    imageUrl: 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&w=600&q=80',
    downloadUrl: 'https://www.microsoft.com/software-download/windows11',
    licenseKeys: ['WIN11-PRO-KNGS-7788-99AA', 'WIN11-PRO-KNGS-4422-BBCC', 'WIN11-PRO-KNGS-3311-DDEE'],
    reviews: [
      {
        id: 'rev-4',
        reviewerName: 'أحمد الشمري',
        reviewerEmail: 'fatima.b@example.com', // matches second preloaded order email
        rating: 5,
        comment: 'كود التفعيل وصلني فوراً على البريد بعد الدفع مباشرة، وتم التنشيط بنجاح وسهولة. خدمة ملوكية فائقة السرعة!',
        date: '2026-06-24T18:00:00Z'
      }
    ]
  },
  {
    id: 'p6',
    name: 'كورس احتراف التجارة الإلكترونية والتسويق 2026',
    description: 'الدورة التعليمية الشاملة التي تأخذك من الصفر إلى إطلاق متجرك الإلكتروني وتحقيق مبيعات ممتازة، تشتمل على 45 درساً مسجلاً ومواد عمل جاهزة.',
    price: 99,
    type: 'digital',
    category: 'تعليم وتدريب',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    downloadUrl: 'https://example.com/king-store/courses/ecommerce-2026.zip'
  },
  {
    id: 'p7',
    name: 'بطاقة شحن ألعاب PlayStation Store $50',
    description: 'بطاقة رصيد لشحن محفظتك الرقمية في متجر بلايستيشن لشراء الألعاب والإضافات. يظهر كود البطاقة فوراً بعد إتمام الدفع.',
    price: 50,
    type: 'digital',
    category: 'بطاقات رقمية',
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    downloadUrl: 'https://playstation.com',
    licenseKeys: ['PSN50-KING-REDEEM-9922', 'PSN50-KING-REDEEM-3344', 'PSN50-KING-REDEEM-5511']
  },
  {
    id: 'p8',
    name: 'اشتراك سنوي Premium في خدمة King IP-TV',
    description: 'بث بجودة 4K لجميع القنوات العالمية والرياضية والأفلام بدون أي تقطيع مع دعم فني متواصل 24/7 لمدة عام كامل.',
    price: 45,
    type: 'digital',
    category: 'اشتراكات ورقميات',
    imageUrl: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80',
    downloadUrl: 'https://example.com/king-tv-setup'
  }
];

export const INITIAL_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'credit_card',
    name: 'الدفع بالبطاقة الائتمانية / مدى',
    iconName: 'CreditCard',
    isEnabled: true,
    instructions: 'يرجى إدخال تفاصيل بطاقتك الائتمانية بأمان لإتمام الدفع الفوري والمباشر.',
    fields: [
      { key: 'card_number', label: 'رقم البطاقة', placeholder: 'xxxx xxxx xxxx xxxx', value: '' },
      { key: 'card_name', label: 'اسم صاحب البطاقة', placeholder: 'الاسم المكتوب على البطاقة', value: '' },
      { key: 'expiry', label: 'تاريخ الانتهاء', placeholder: 'MM/YY', value: '' },
      { key: 'cvv', label: 'الرمز السري CVV', placeholder: 'xxx', value: '' }
    ]
  },
  {
    id: 'instapay_wallet',
    name: 'محفظة إلكترونية / إنستاباي (Instapay)',
    iconName: 'Smartphone',
    isEnabled: true,
    instructions: 'قم بتحويل القيمة المطلوبة إلى رقم المحفظة الموضح أدناه، ثم أدخل رقم التحويل أو رقم الهاتف للتأكيد.',
    accountIdentifier: '01xxxxxxxxx',
    fields: [
      { key: 'wallet_number', label: 'رقم هاتف المحول منه', placeholder: '01xxxxxxxxx أو رقم الهاتف المسجل', value: '' },
      { key: 'txn_id', label: 'رقم مرجع التحويل / الإرسال', placeholder: 'رقم العملية المكون من 12 رقم', value: '' }
    ]
  },
  {
    id: 'paypal',
    name: 'حساب PayPal الإلكتروني',
    iconName: 'Wallet',
    isEnabled: true,
    instructions: 'يرجى تسجيل الدخول إلى PayPal وتأكيد التحويل إلى حساب المتجر الرسمي.',
    accountIdentifier: 'payment@kingstore.com',
    fields: [
      { key: 'paypal_email', label: 'بريدك الإلكتروني في بايبال', placeholder: 'example@email.com', value: '' }
    ]
  },
  {
    id: 'bank_transfer',
    name: 'تحويل بنكي مباشر',
    iconName: 'Building',
    isEnabled: false,
    instructions: 'قم بتحويل المبلغ إلى حسابنا البنكي، ثم ارفق تفاصيل التحويل أدناه.',
    accountIdentifier: 'SA398000012345678901234',
    fields: [
      { key: 'sender_name', label: 'اسم المحول الثلاثي', placeholder: 'الاسم كما يظهر في كشف الحساب', value: '' },
      { key: 'bank_name', label: 'اسم البنك المحول منه', placeholder: 'مثال: البنك الأهلي، بنك الرياض...', value: '' },
      { key: 'transfer_time', label: 'تاريخ ووقت التحويل', placeholder: 'مثال: اليوم الساعة 2 ظهراً', value: '' }
    ]
  },
  {
    id: 'syriatel_cash',
    name: 'سيريتل كاش (Syriatel Cash)',
    iconName: 'Smartphone',
    isEnabled: true,
    instructions: 'التحويل من حساب إلى حساب مجاني تماماً وبدون أي رسوم إضافية. يرجى تحويل قيمة الطلب مباشرة إلى رقم سيريتل كاش الموضح أدناه، ثم ملء البيانات وإرفاق الإيصال لتأكيد الدفع.',
    accountIdentifier: '0987654321',
    fields: [
      { key: 'sender_name', label: 'الاسم الكامل للمرسل (الاسم الثلاثي للزبون)', placeholder: 'اكتب اسمك الثلاثي كما هو في حساب الدفع', value: '' },
      { key: 'phone_number', label: 'رقم الهاتف المشترك بخدمة سيريتل كاش', placeholder: '09xxxxxxxx', value: '' },
      { key: 'txn_id', label: 'معرف العملية / رقم الحوالة', placeholder: 'رقم العملية المستورد من تطبيق أقرب إليك', value: '' }
    ]
  },
  {
    id: 'mtn_cash',
    name: 'إم تي إن كاش (MTN Cash)',
    iconName: 'Smartphone',
    isEnabled: true,
    instructions: 'التحويل من حساب إلى حساب مجاني تماماً وبدون أي رسوم إضافية. يرجى تحويل قيمة الطلب مباشرة إلى رقم MTN Cash الموضح أدناه، ثم ملء البيانات وإرفاق الإيصال لتأكيد الدفع.',
    accountIdentifier: '0998765432',
    fields: [
      { key: 'sender_name', label: 'الاسم الكامل للمرسل (الاسم الثلاثي للزبون)', placeholder: 'اكتب اسمك الثلاثي كما هو في حساب الدفع', value: '' },
      { key: 'phone_number', label: 'رقم الهاتف المشترك بخدمة MTN Cash', placeholder: '09xxxxxxxx', value: '' },
      { key: 'txn_id', label: 'معرف العملية / رقم الحوالة', placeholder: 'رقم العملية المستورد من تطبيق MTN', value: '' }
    ]
  },
  {
    id: 'cash_on_delivery',
    name: 'الدفع عند الاستلام (COD)',
    iconName: 'Truck',
    isEnabled: true,
    instructions: 'ادفع نقداً أو بالبطاقة لمندوب التوصيل عند استلام طلبك في عنوانك. (متوفر فقط للمنتجات الملموسة).',
    fields: []
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-54891',
    customerName: 'أحمد محمود العتيبي',
    customerEmail: 'ahmed.otb@example.com',
    customerPhone: '+966501234567',
    shippingAddress: 'المملكة العربية السعودية، الرياض، حي الياسمين، شارع الملقا',
    items: [
      {
        productId: 'p1',
        productName: 'هاتف ذكي فاخر K-Phone 15 Ultra',
        price: 1199,
        quantity: 1,
        type: 'physical'
      },
      {
        productId: 'p4',
        productName: 'سترة هودي قطنية مطرزة بالثقافة الملكية',
        price: 79,
        quantity: 1,
        type: 'physical'
      }
    ],
    totalAmount: 1278,
    paymentMethodId: 'credit_card',
    paymentDetails: {
      card_number: '**** **** **** 4321',
      card_name: 'Ahmed Al-Otaibi'
    },
    status: 'completed',
    date: '2026-06-25T14:30:00Z'
  },
  {
    id: 'ORD-93012',
    customerName: 'فاطمة الزهراء البلوشي',
    customerEmail: 'fatima.b@example.com',
    customerPhone: '+96891234567',
    items: [
      {
        productId: 'p5',
        productName: 'مفتاح تفعيل أصلي Windows 11 Pro',
        price: 29,
        quantity: 2,
        type: 'digital'
      },
      {
        productId: 'p6',
        productName: 'كورس احتراف التجارة الإلكترونية والتسويق 2026',
        price: 99,
        quantity: 1,
        type: 'digital'
      }
    ],
    totalAmount: 157,
    paymentMethodId: 'instapay_wallet',
    paymentDetails: {
      wallet_number: '01011223344',
      txn_id: 'TXN99884433221'
    },
    status: 'pending',
    date: '2026-06-26T09:15:00Z'
  }
];
