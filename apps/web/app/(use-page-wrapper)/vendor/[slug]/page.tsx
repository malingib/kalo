"use client";

import React, { useState } from "react";

interface Service {
  id: number;
  title: string;
  description: string;
  price: number;
  depositAmount: number;
  duration: number;
}

const MOCK_VENDOR = {
  businessName: "BarberHub Westlands",
  businessSlug: "barberhub-westlands",
  businessBio: "Premium grooming, executive haircuts, beard styling, and hot towel facials in Westlands, Nairobi.",
  locationText: "2nd Floor, Westlands Mall, Ring Road, Nairobi",
  logoUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=150&auto=format&fit=crop&q=80",
  coverImageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&auto=format&fit=crop&q=80",
  currency: "KES",
  timezone: "Africa/Nairobi (EAT)",
  whatsappPhone: "+254712345678",
  services: [
    { id: 1, title: "Executive Haircut & Wash", description: "Haircut, head wash, scalp massage, and hot towel finish.", price: 1500, depositAmount: 500, duration: 45 },
    { id: 2, title: "Beard Sculpt & Styling", description: "Beard trim, razor line-up, and nourishing oil treatment.", price: 800, depositAmount: 0, duration: 30 },
    { id: 3, title: "Full Grooming Package", description: "Haircut, beard sculpt, facial scrub, and shoulder massage.", price: 2800, depositAmount: 1000, duration: 75 },
  ] as Service[],
};

const TIME_SLOTS = [
  "Today 10:00 AM", "Today 11:30 AM", "Today 2:00 PM", "Today 4:00 PM",
  "Tomorrow 09:00 AM", "Tomorrow 11:00 AM", "Tomorrow 02:30 PM", "Tomorrow 04:30 PM",
];

export default function VendorPublicStorefrontPage() {
  const vendor = MOCK_VENDOR;
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const uid = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      setBookingSuccess(uid);
    }, 1500);
  };

  const fmt = (v: number) => `KES ${v.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white pb-16">
      {/* Cover Banner */}
      <div className="h-48 md:h-64 w-full bg-cover bg-center relative" style={{ backgroundImage: `url(${vendor.coverImageUrl})` }}>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 relative -mt-16 sm:-mt-20 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <img
            src={vendor.logoUrl}
            alt={vendor.businessName}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-md border-4 border-white dark:border-gray-800"
          />
          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{vendor.businessName}</h1>
              <a
                href={`https://wa.me/${vendor.whatsappPhone.replace(/[^0-9]/g, "")}?text=Hi!%20I'd%20like%20to%20book%20an%20appointment.`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition shadow-sm"
              >
                💬 Book via WhatsApp
              </a>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{vendor.businessBio}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span>📍 {vendor.locationText}</span>
              <span>🕒 UTC+3 (East Africa Time)</span>
            </div>
          </div>
        </div>

        {/* Services & Booking Form */}
        {bookingSuccess ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-green-200 dark:border-green-800 text-center space-y-4 shadow-lg">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto">
              🎉
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Request Received!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              Reference Code: <span className="font-mono font-bold text-gray-900 dark:text-white">{bookingSuccess}</span>
            </p>
            {selectedService && selectedService.depositAmount > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-left max-w-md mx-auto text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold">📲 M-Pesa STK Push Prompt Sent</p>
                <p>We have sent an M-Pesa prompt to <strong>{customerPhone}</strong> for deposit of <strong>{fmt(selectedService.depositAmount)}</strong>.</p>
                <p>Please enter your M-Pesa PIN on your phone to complete your reservation.</p>
              </div>
            )}
            <button
              onClick={() => { setBookingSuccess(null); setSelectedService(null); setSelectedSlot(""); }}
              className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold text-sm rounded-xl hover:opacity-80 transition"
            >
              Book Another Service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Catalog List */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select a Service</h2>
              <div className="space-y-3">
                {vendor.services.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      selectedService?.id === s.id
                        ? "bg-white dark:bg-gray-800 border-black dark:border-white ring-2 ring-black dark:ring-white shadow-md"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base">{s.title}</h3>
                        <span className="text-xs text-gray-400">({s.duration} mins)</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.description}</p>
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(s.price)}</p>
                      {s.depositAmount > 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Dep: {fmt(s.depositAmount)}</p>
                      ) : (
                        <p className="text-xs text-gray-400">No deposit</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Form Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg space-y-5 h-fit">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reservation Details</h2>

              {selectedService ? (
                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-1 text-xs">
                    <p className="font-bold text-gray-900 dark:text-white">{selectedService.title}</p>
                    <p className="text-gray-500 dark:text-gray-300">Total: {fmt(selectedService.price)} {selectedService.depositAmount > 0 && `(Deposit: ${fmt(selectedService.depositAmount)})`}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Time Slot</label>
                    <select
                      required
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">-- Choose a Slot --</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Your Full Name</label>
                    <input
                      required
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Brian Otieno"
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">M-Pesa Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl text-sm hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Processing..." : selectedService.depositAmount > 0 ? `Pay Deposit ${fmt(selectedService.depositAmount)} via M-Pesa` : "Confirm Reservation"}
                  </button>
                </form>
              ) : (
                <div className="text-center py-8 text-gray-400 text-xs">
                  👈 Select a service on the left to start your booking.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
