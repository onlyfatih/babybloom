/**
 * PROTOTYPE DEMO CONTENT — NOT MEDICALLY REVIEWED.
 *
 * Written for layout and flow testing only. Every entry is `isDemo: true`,
 * `editorialStatus: 'draft'`, has no sources and no review. The production
 * content gate (isDisplayable(..., 'production')) hides all of them.
 * Replace with reviewed, sourced articles before any release (docs/content-model.md).
 */
import type { WeeklyContent } from '../../schemas/weekly-content';

const demo = (week: number, rest: Pick<WeeklyContent, 'title' | 'summary' | 'babyDevelopment' | 'parentExperience' | 'sizeAnalogy'>): WeeklyContent => ({
  id: `pregnancy-week-${week}`,
  locale: 'tr',
  week,
  illustrationId: `week-stage-${week}`,
  measurementConvention: 'none',
  sources: [],
  editorialStatus: 'draft',
  contentVersion: '0.1.0',
  reviewedOn: null,
  reviewedBy: null,
  isDemo: true,
  ...rest,
});

export const demoWeeks: WeeklyContent[] = [
  demo(8, {
    title: 'Küçük ama hızlı değişen bir dönem',
    summary: 'Bu haftaları birçok aile “her şeyin yeni başladığı” zaman olarak hatırlar.',
    babyDevelopment: [
      'Demo metin: Bu bölümde, uzman incelemesinden geçmiş haftalık gelişim bilgisi yer alacak.',
      'Prototipte metin uzunluklarını ve satır kırılmalarını görebilmeniz için örnek cümleler kullanıyoruz.',
    ],
    parentExperience: [
      'Demo metin: Bu dönemde aklınıza gelen soruları bir not olarak kaydedip randevunuzda sorabilirsiniz.',
    ],
    sizeAnalogy: { objectLabel: 'bir ahududu' },
  }),
  demo(12, {
    title: 'İlk üç ayın sonuna yaklaşırken',
    summary: 'Birçok aile bu haftalarda haberi yakınlarıyla paylaşmayı düşünür.',
    babyDevelopment: ['Demo metin: İncelenmiş içerik burada, kaynaklarıyla birlikte gösterilecek.'],
    parentExperience: [
      'Demo metin: Bu haftanın duygularını bir anı olarak yazmak isterseniz, “Ekle” düğmesini kullanabilirsiniz.',
    ],
    sizeAnalogy: { objectLabel: 'bir erik' },
  }),
  demo(20, {
    title: 'Yolun yarısı',
    summary: 'Yirminci hafta, birçok aile için yolculuğun ortası gibi hissedilir.',
    babyDevelopment: ['Demo metin: Bu paragrafın yerini uzman tarafından yazılmış ve incelenmiş bilgi alacak.'],
    parentExperience: ['Demo metin: Bu haftalarda bebeğinize bir mektup yazmak güzel bir anı olabilir.'],
    sizeAnalogy: { objectLabel: 'bir muz' },
  }),
  demo(24, {
    title: 'Sesler, hareketler, hayaller',
    summary: 'Bu haftaları kaydetmek için küçük bir not bile yeterli.',
    babyDevelopment: [
      'Demo metin: Haftalık gelişim bilgisi incelenip yayımlandığında burada görünecek.',
      'Uzun Türkçe metinlerin ekrana nasıl sığdığını görmek için bu cümle bilerek biraz daha uzun tutulmuştur; özellikle küçük ekranlarda ve büyük yazı boyutunda okunabilirliği kontrol ediyoruz.',
    ],
    parentExperience: [
      'Demo metin: Hissettiklerinizi, merak ettiklerinizi ya da hazırlıklarınızı not alabilirsiniz.',
      'Randevularınızı “Takip” sekmesinden kendiniz ekleyebilirsiniz.',
    ],
    sizeAnalogy: { objectLabel: 'bir mısır koçanı' },
  }),
  demo(32, {
    title: 'Hazırlıkların hızlandığı haftalar',
    summary: 'Odayı, çantayı ya da aklınızdakileri düzenlemek için iyi bir zaman olabilir.',
    babyDevelopment: ['Demo metin: İncelenmiş içerik burada yer alacak.'],
    parentExperience: ['Demo metin: Destek olacak aile üyelerini “Aile” sekmesinden davet edebilirsiniz.'],
    sizeAnalogy: { objectLabel: 'bir hindistan cevizi' },
  }),
  demo(38, {
    title: 'Her an olabilir',
    summary: 'Tahmini tarih yaklaşırken her aile bu bekleyişi farklı yaşar.',
    babyDevelopment: ['Demo metin: İncelenmiş içerik burada yer alacak.'],
    parentExperience: [
      'Demo metin: Bebeğiniz doğduğunda “Bebeğimiz doğdu” seçeneğiyle çocuk profiline geçebilirsiniz; uygulama bunu sizin yerinize yapmaz.',
    ],
    sizeAnalogy: { objectLabel: 'küçük bir karpuz' },
  }),
];
