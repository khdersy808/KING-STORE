/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Smartphone, Package, Zap, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  globalDiscount?: number;
  key?: string | number;
}

export default function ProductCard({ product, onAddToCart, onViewDetails, globalDiscount = 0 }: ProductCardProps) {
  const { t } = useLanguage();
  const isPhysical = product.type === 'physical';
  const outOfStock = isPhysical && (product.stock === undefined || product.stock <= 0);

  const reviews = product.reviews || [];
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const hasGlobalDiscount = globalDiscount > 0;
  const productSpecificDiscount = product.discountPercentage || 0;
  const totalDiscount = Math.max(globalDiscount, productSpecificDiscount);
  const hasDiscount = totalDiscount > 0;

  const discountedPrice = hasDiscount
    ? Math.round(product.price * (1 - totalDiscount / 100))
    : product.price;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0d0d0d] hover:border-amber-500/40 transition-all duration-300">
      
      {/* Product Image Container */}
      <div 
        onClick={() => onViewDetails(product)}
        className="relative aspect-video w-full overflow-hidden bg-zinc-900 cursor-pointer"
      >
        <img
          src={product.imageUrl || 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80'}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Type Badge (Physical vs Digital) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {isPhysical ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 shadow-sm">
              <Package className="h-3 w-3 text-amber-500" />
              <span>{t('physicalProduct')}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900/90 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Zap className="h-3 w-3 text-emerald-400" />
              <span>{t('digitalProduct')}</span>
            </span>
          )}
          
          {/* Coupon Badge 🔥 */}
          {hasDiscount && (
            <div className="animate-slide-up">
              <span className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 px-3 py-1 text-[10px] font-black text-white shadow-xl shadow-red-600/20 ring-1 ring-white/20">
                <Star className="h-3 w-3 fill-white" />
                <span>{t('discountLabel')} {totalDiscount}% 🔥</span>
              </span>
            </div>
          )}
        </div>

        {/* Rating Badge */}
        {averageRating && (
          <div className="absolute top-3 left-3 flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-zinc-950/90 px-2 py-0.5 rounded-full border border-amber-500/20 shadow-sm backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{averageRating}</span>
            <span className="text-[9px] text-zinc-500 font-normal">({reviews.length})</span>
          </div>
        )}

        {/* Category Badge */}
        <span className="absolute bottom-3 left-3 rounded-md bg-zinc-950/85 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-zinc-800 uppercase">
          {product.category}
        </span>
      </div>

      {/* Product Information */}
      <div className="flex flex-1 flex-col p-5">
        <div 
          onClick={() => onViewDetails(product)}
          className="flex-1 cursor-pointer"
        >
          <h3 className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400 line-clamp-2">
            {product.description}
          </p>
        </div>

        {/* Stock / Download status */}
        <div className="mt-4 flex items-center justify-between border-t border-zinc-900 pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-500 font-semibold">{t('price')}</span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xl font-black text-amber-400">
                ${discountedPrice.toLocaleString()}
              </span>
              {hasDiscount && (
                <span className="text-xs text-zinc-500 line-through">
                  ${product.price.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            {isPhysical ? (
              outOfStock ? (
                <span className="inline-flex items-center text-xs font-bold text-red-400 bg-red-950/40 px-2.5 py-1 rounded-lg border border-red-900/30">
                  {t('outOfStock')}
                </span>
              ) : (
                <span className="text-xs font-medium text-zinc-300 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {t('remaining')} <strong className="text-amber-400">{product.stock}</strong> {t('piece')}
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-900/30">
                <Zap className="h-3.5 w-3.5 animate-pulse" />
                <span>{t('readyToDownload')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() => onAddToCart(product)}
          disabled={outOfStock}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            outOfStock
              ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-850'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 active:scale-98 shadow-md shadow-amber-500/10'
          }`}
          id={`add-to-cart-${product.id}`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>{outOfStock ? t('soldOut') : t('addToCartLong')}</span>
        </button>
      </div>
    </div>
  );
}
