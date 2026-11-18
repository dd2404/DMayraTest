import React from 'react';
import { HelpCircle, Mail, Phone, Shield, Truck } from 'lucide-react';
import { Locale, StoreSettings } from '../types/domain';

interface InfoFaqViewProps {
  locale: Locale;
  settings: StoreSettings;
}

export const InfoFaqView: React.FC<InfoFaqViewProps> = ({ locale, settings }) => {
  const faqs =
    locale === 'ms'
      ? [
          {
            q: 'Adakah kedai fizikal atau ambil sendiri (self-pickup) disediakan?',
            a: 'Tidak. D\'Mayra Layer Cake beroperasi 100% dari dapur rumah di Balik Pulau, Pulau Pinang tanpa kedai fizikal atau walk-in pick-up. Penghantaran hanya melalui kurier (Pos Laju, City-Link, J&T) atau penghantaran terus RM5 oleh pemilik di kawasan Balik Pulau.',
          },
          {
            q: 'Mengapa pos kurier hanya dibuat pada hari Isnin hingga Rabu?',
            a: 'Supaya kek lapis anda tidak tersangkut di gudang kurier sepanjang hujung minggu dan kekal segar apabila tiba di destinasi.',
          },
          {
            q: 'Berapa lama kek lapis bertahan selepas dipos?',
            a: 'Pemilik menyahbeku kek sebelum pengeposan. Kek dibungkus dalam kotak kukuh dan tahan kira-kira 5 hari pada suhu bilik, atau sehingga beberapa minggu jika disimpan sejuk.',
          },
          {
            q: 'Bagaimana jika kek rosak semasa penghantaran kurier?',
            a: 'Semua laporan kerosakan atau kelewatan mestilah dibuat melalui halaman Jejak Pesanan bersama gambar bukti. Pemilik akan menilai penggantian atau pemulangan wang mengikut terma.',
          },
        ]
      : [
          {
            q: 'Do you offer walk-in shop pickup?',
            a: 'No. D\'Mayra Layer Cake operates solely from our Balik Pulau home kitchen with zero walk-in pickup. Fulfilment is either nationwide courier (Pos Laju, City-Link, J&T) or RM5 flat owner delivery in Balik Pulau.',
          },
          {
            q: 'Why are courier orders only dispatched Monday to Wednesday?',
            a: 'Dispatching early in the week prevents layer cakes from sitting inside courier depots over the weekend.',
          },
          {
            q: 'How long do cakes keep in transit?',
            a: 'Cakes are defrosted prior to dispatch, travel at room temperature in protective boxing, and keep approximately 5 days at room temperature.',
          },
          {
            q: 'How do I report transit damage or delay?',
            a: 'All claims must be submitted exclusively on the Order Tracking page with photo evidence attached for owner assessment.',
          },
        ];

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#292524]">
          {locale === 'ms'
            ? 'Tentang D\'Mayra, Soalan Lazim & Polisi'
            : 'About D\'Mayra, FAQ & Store Policies'}
        </h1>
        <p className="text-sm text-[#554336] mt-1">
          {settings.storeName} · {settings.ssmNo}
        </p>
      </div>

      {/* Contact & Locality */}
      <section className="bakery-glass rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#831843] flex items-center gap-1.5">
            <Truck className="w-4 h-4" />
            <span>{locale === 'ms' ? 'Dapur Rumah' : 'Home Kitchen'}</span>
          </p>
          <p className="font-semibold text-[#292524]">Balik Pulau, Pulau Pinang</p>
          <p className="text-xs text-[#554336]">
            {locale === 'ms'
              ? `Poskod liputan RM5: ${settings.selfDelivery.postcodes.join(', ')}`
              : `RM5 self-delivery postcodes: ${settings.selfDelivery.postcodes.join(', ')}`}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#831843] flex items-center gap-1.5">
            <Phone className="w-4 h-4" />
            <span>{locale === 'ms' ? 'Hubungi Pemilik' : 'Owner Contact'}</span>
          </p>
          <p className="font-semibold text-[#292524]">{settings.contactPhone}</p>
          <a
            href={`https://wa.me/${settings.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#D97706] hover:underline"
          >
            WhatsApp D&apos;Mayra
          </a>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#831843] flex items-center gap-1.5">
            <Mail className="w-4 h-4" />
            <span>{locale === 'ms' ? 'Emel Rasmi' : 'Official Email'}</span>
          </p>
          <p className="font-semibold text-[#292524] break-all">{settings.contactEmail}</p>
        </div>
      </section>

      {/* FAQs */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold text-[#292524] flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#831843]" />
          <span>{locale === 'ms' ? 'Soalan Lazim (FAQ)' : 'Frequently Asked Questions'}</span>
        </h2>
        <div className="space-y-3">
          {faqs.map((item, idx) => (
            <div key={idx} className="bakery-glass rounded-xl p-5 space-y-1.5">
              <h3 className="font-semibold text-base text-[#292524]">{item.q}</h3>
              <p className="text-sm text-[#554336] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Terms & PDPA Privacy */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bakery-glass rounded-xl p-5 space-y-2.5">
          <h2 className="font-display text-xl font-bold text-[#292524]">
            {locale === 'ms' ? 'Terma & Polisi Pembatalan' : 'Terms & Cancellation Policy'} (v
            {settings.termsVersion})
          </h2>
          <p className="text-xs text-[#554336] whitespace-pre-line leading-relaxed">
            {settings.termsText[locale]}
          </p>
        </div>

        <div className="bakery-glass rounded-xl p-5 space-y-2.5">
          <h2 className="font-display text-xl font-bold text-[#292524] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#831843]" />
            <span>{locale === 'ms' ? 'Notis Privasi (PDPA 2010)' : 'Privacy Notice (PDPA 2010)'}</span>
          </h2>
          <p className="text-xs text-[#554336] whitespace-pre-line leading-relaxed">
            {settings.privacyText[locale]}
          </p>
        </div>
      </section>
    </div>
  );
};
