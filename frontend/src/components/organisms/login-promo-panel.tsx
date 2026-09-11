const BRAND_PHOTO_SRC = "/assets/login_promo_brand.webp";
const LOGO_ICON_SRC = "/assets/tattlogoIcon.svg";

export function LoginPromoPanel() {
  return (
    <aside className="relative hidden h-full flex-1 overflow-hidden bg-[#181811] lg:block">
      <img
        src={BRAND_PHOTO_SRC}
        alt="African Think Tank community members"
        className="absolute inset-0 h-full w-full object-cover object-[30%_50%] opacity-60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#181811]/80 via-transparent to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-center p-10 sm:p-12 xl:p-16">
        <div className="mb-8">
          

          <h2 className="max-w-[491px] text-5xl font-black leading-[1.1] text-white">
            Empowering Leaders across the Diaspora.
          </h2>
          <p className="mt-6 max-w-[448px] text-lg leading-[1.625] text-white/80">
            Join a global network of innovators and intellectuals dedicated to
            advancing the African continent and its people through collaborative
            excellence.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="h-1 w-12 rounded-full bg-tatt-lime" />
          <span className="h-1 w-4 rounded-full bg-white/30" />
          <span className="h-1 w-4 rounded-full bg-white/30" />
        </div>
      </div>
    </aside>
  );
}
