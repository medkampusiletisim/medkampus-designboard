# MedKampüs - Ödeme ve Hakediş Takip Sistemi

## Proje Özeti

MedKampüs, YKS (Üniversite Sınavı) koçluğu sunan bir platformdur. Bu sistem, platformun finansal akışını (öğrenci ödemeleri ve koç hakedişleri) yönetmek için tasarlanmıştır.

## Temel İş Modeli

- **Öğrenci Ödemesi**: Öğrenciler 1-6 aylık paketlerden birini seçer ve tüm ücreti peşin öder
- **Koç Hakedişi**: Koçlar, her aktif öğrenci için aylık sabit bir ücret (varsayılan: 1100 TL) alır
- **Ödeme Günü**: Tüm koçlara toplu ödeme her ayın belirli bir gününde (varsayılan: 28) yapılır
- **Kıstelyevm Hesaplama**: Ödemeler 30 günlük ay bazında prorata hesaplanır

## Teknik Mimari

### Frontend
- React + TypeScript
- Wouter (routing)
- TanStack Query (data fetching)
- Shadcn UI (component library)
- Tailwind CSS (styling)
- Turkish language support
- Material Design principles

### Backend
- Express.js
- PostgreSQL (Neon)
- Drizzle ORM
- Type-safe API endpoints

### Database Schema

1. **system_settings**: Global sistem ayarları
   - coachMonthlyFee: Koç aylık ücreti
   - globalPaymentDay: Ödeme günü (1-31)

2. **coaches**: Koç bilgileri
   - firstName, lastName, email, phone
   - university, field
   - isActive: Aktif/arşiv durumu

3. **students**: Öğrenci bilgileri
   - firstName, lastName, email, phone
   - coachId: Atanan koç
   - packageMonths: Paket süresi (1-6 ay)
   - packageStartDate, packageEndDate
   - isActive: Aktif/arşiv durumu

4. **payment_records**: Ödeme geçmişi
   - coachId, paymentDate
   - totalAmount, studentCount
   - breakdown: Öğrenci bazında detaylar
   - status: Ödeme durumu (pending/paid)
   - paidAt, paidBy, notes

5. **coach_transfers**: Koç değişiklik geçmişi
   - studentId, oldCoachId, newCoachId
   - transferDate: Transfer tarihi
   - notes: Transfer notları

## API Endpoints

### System Settings
- `GET /api/settings` - Ayarları getir
- `PUT /api/settings` - Ayarları güncelle

### Coaches
- `GET /api/coaches` - Tüm koçları listele
- `GET /api/coaches/:id` - Koç detayı
- `POST /api/coaches` - Yeni koç ekle
- `PUT /api/coaches/:id` - Koç güncelle
- `DELETE /api/coaches/:id` - Koç arşivle

### Students
- `GET /api/students` - Tüm öğrencileri listele
- `GET /api/students/:id` - Öğrenci detayı
- `POST /api/students` - Yeni öğrenci ekle
- `PUT /api/students/:id` - Öğrenci güncelle
- `DELETE /api/students/:id` - Öğrenci arşivle

### Dashboard & Payments
- `GET /api/dashboard/stats` - Özet istatistikler
- `GET /api/dashboard/renewal-alerts` - Paket yenileme uyarıları
- `GET /api/payments/current-month` - Güncel ay hakediş hesaplaması
- `POST /api/payments/save` - Ödeme kayıtlarını kaydet
- `PUT /api/payments/:id/mark-paid` - Ödemeyi ödenmiş olarak işaretle
- `GET /api/payments/history` - Tüm ödeme geçmişi

### Coach Transfers
- `POST /api/students/:id/transfer-coach` - Öğrencinin koçunu değiştir
- `GET /api/students/:id/transfer-history` - Öğrencinin koç geçmişi

## Kıstelyevm (Prorated) Hesaplama Mantığı

Sistem, koç ödemelerini şu mantıkla hesaplar:

1. **Ödeme Döngüsü**: Bir önceki ödeme gününden (dahil değil) mevcut ödeme gününe (dahil)
   - Örnek: Ödeme günü 28 ise → 29 Ekim - 28 Kasım arası

2. **Günlük Ücret**: `Aylık Ücret / 30 gün`

3. **Öğrenci Bazında Hesaplama**:
   - Öğrencinin paket başlangıç ve bitiş tarihleri kontrol edilir
   - Ödeme döngüsü içinde çalışılan günler hesaplanır
   - Hakediş = Günlük Ücret × Çalışılan Gün Sayısı

4. **Koç Değişikliği Durumunda**:
   - Eğer öğrenci ödeme döngüsü içinde koç değiştirmişse:
     * Eski koç: Transfer tarihinden önceki günler için ödeme alır
     * Yeni koç: Transfer tarihinden itibaren günler için ödeme alır
   - Her koç sadece öğrenciyle çalıştığı günler için hakediş alır
   - Transfer geçmişi `coach_transfers` tablosunda saklanır

5. **Özel Durumlar**:
   - Yeni başlayan öğrenci: Başlangıç tarihinden ödeme gününe kadar
   - Paketi biten öğrenci: Son ödeme gününden bitiş tarihine kadar
   - Tam ay çalışan: Tam aylık ücret

## Sayfa Yapısı

### Ana Sayfa (Dashboard)
- Aktif koç/öğrenci sayıları
- Beklenen aylık ödeme
- Tahmini komisyon
- Paket yenileme uyarıları (7 gün kala / süresi dolmuş)

### Öğrenciler
- Tüm öğrencilerin listesi
- Arama ve filtreleme
- Paket durumu (Aktif / Bitiyor / Süresi Doldu)
- Öğrenci ekleme/düzenleme/arşivleme

### Koçlar
- Tüm koçların listesi
- Aktif öğrenci sayıları
- Koç ekleme/düzenleme/arşivleme

### Ödemeler
- Güncel ay hakediş özeti
- Koç bazında toplam tutarlar
- Genişletilebilir öğrenci detayları
- Kıstelyevm hesaplaması ile detaylı döküm

### Ayarlar
- Koç aylık hakediş ücreti
- Global ödeme günü
- Tüm hesaplamaları etkileyen global parametreler

## Geliştirme

```bash
npm install
npm run dev
```

## Veritabanı Yönetimi

```bash
# Schema değişikliklerini uygula
npm run db:push

# Schema değişikliklerini zorla uygula
npm run db:push --force
```

## Önemli Notlar

1. Öğrenci eklendiğinde paket bitiş tarihi otomatik hesaplanır
2. Arşivlenen kayıtlar silinmez, sadece isActive=0 yapılır
3. Koç arşivlenirken aktif öğrencisi varsa uyarı verilir
4. Tüm tarih ve saat hesaplamaları date-fns kütüphanesi ile yapılır
5. Para birimi TL (Türk Lirası) olarak gösterilir
6. Tüm metinler Türkçe'dir
