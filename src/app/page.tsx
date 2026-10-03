"use client";

import Image from "next/image";

import { buildPile } from "./gachaPile";

import { useGachaPhysics } from "./useGachaPhysics";

import { useEffect, useRef, useState } from "react";

const CONFETTI_COLORS = [

   "#ff6a42",

   "#572514",

   "#000000",

   "#fefbec",

];

type Particle = {

   x: number;

   y: number;

   vx: number;

   vy: number;

   gravity: number;

   drag: number;

   rotation: number;

   rotationSpeed: number;

   width: number;

   height: number;

   opacity: number;

   color: string;

   shape: "rect" | "dot" | "star";

   delay: number;

};

function ConfettiCanvas() {

   const canvasRef = useRef<HTMLCanvasElement>(null);

   useEffect(() => {

      const canvas = canvasRef.current;

      if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      let raf = 0;

      let width = window.innerWidth;

      let height = window.innerHeight;

      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      let particles: Particle[] = [];

      const startTime = performance.now();

      const duration = 5000;

      const fadeStart = 3800;

      const random = (min: number, max: number) => min + Math.random() * (max - min);

      const resize = () => {

         width = window.innerWidth;

         height = window.innerHeight;

         dpr = Math.min(window.devicePixelRatio || 1, 2);

         canvas.width = Math.round(width * dpr);

         canvas.height = Math.round(height * dpr);

         canvas.style.width = `${width}px`;

         canvas.style.height = `${height}px`;

         ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      };

      const createParticles = () => {

         const count = width <= 430 ? 100 : 130;

         particles = Array.from({ length: count }, (_, index) => {

            const side = index % 2 === 0 ? -1 : 1;

            const launchX = side < 0 ? random(width * 0.08, width * 0.28) : random(width * 0.72, width * 0.92);

            return {

               x: launchX,

               y: random(height * 0.82, height * 0.96),

               vx: -side * random(0.15, 1.35) + random(-0.7, 0.7),

               vy: -random(height * 0.017, height * 0.023),

               gravity: random(0.12, 0.17),

               drag: random(0.996, 0.999),

               rotation: random(0, Math.PI * 2),

               rotationSpeed: random(-0.2, 0.2),

               width: random(4, 8),

               height: random(7, 14),

               opacity: random(0.78, 1),

               color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],

               shape: index % 11 === 0 ? "star" : index % 4 === 0 ? "dot" : "rect",

               delay: random(0, 650),

            };

         });

      };

      const drawStar = (x: number, y: number, radius: number) => {

         ctx.beginPath();

         for (let point = 0; point < 10; point += 1) {

            const angle = -Math.PI / 2 + (point * Math.PI) / 5;

            const r = point % 2 === 0 ? radius : radius * 0.42;

            const px = x + Math.cos(angle) * r;

            const py = y + Math.sin(angle) * r;

            if (point === 0) ctx.moveTo(px, py);

            else ctx.lineTo(px, py);

         }

         ctx.closePath();

         ctx.fill();

      };

      const render = (now: number) => {

         const elapsed = now - startTime;

         ctx.clearRect(0, 0, width, height);

         particles.forEach((p) => {

            if (elapsed < p.delay) return;

            p.vx *= p.drag;

            p.vy += p.gravity;

            p.x += p.vx;

            p.y += p.vy;

            p.rotation += p.rotationSpeed;

            let alpha = p.opacity;

            if (elapsed > fadeStart) alpha *= 1 - Math.min(1, (elapsed - fadeStart) / (duration - fadeStart));

            if (alpha <= 0 || p.y > height + 30) return;

            ctx.save();

            ctx.globalAlpha = alpha;

            ctx.fillStyle = p.color;

            ctx.translate(p.x, p.y);

            ctx.rotate(p.rotation);

            if (p.shape === "dot") {

               ctx.beginPath();

               ctx.arc(0, 0, p.width * 0.55, 0, Math.PI * 2);

               ctx.fill();

            } else if (p.shape === "star") {

               drawStar(0, 0, p.width);

            } else {

               ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);

            }

            ctx.restore();

         });

         if (elapsed < duration) raf = requestAnimationFrame(render);

         else ctx.clearRect(0, 0, width, height);

      };

      resize();

      createParticles();

      const handleResize = () => {

         resize();

         createParticles();

      };

      window.addEventListener("resize", handleResize);

      raf = requestAnimationFrame(render);

      return () => {

         cancelAnimationFrame(raf);

         window.removeEventListener("resize", handleResize);

         ctx.clearRect(0, 0, width, height);

      };

   }, []);

   return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;

}

function BirthdayAudio() {

   const audioRef = useRef<HTMLAudioElement>(null);

   const [isPlaying, setIsPlaying] = useState(false);

   const [audioError, setAudioError] = useState(false);

   useEffect(() => {

      const audio = audioRef.current;

      if (!audio) return;

      audio.volume = 0.42;

      const syncState = () => {

         setIsPlaying(!audio.paused && !audio.ended);

      };

      const handleError = () => {

         setAudioError(true);

         setIsPlaying(false);

      };

      const tryPlay = async () => {

         try {

            await audio.play();

            setIsPlaying(true);

            setAudioError(false);

         } catch {

            // Autoplay with sound can be blocked by the browser.

            // First user interaction will retry playback.

            setIsPlaying(false);

         }

      };

      const unlockAudio = () => {

         if (audio.paused) {

            void tryPlay();

         }

      };

      audio.addEventListener("play", syncState);

      audio.addEventListener("pause", syncState);

      audio.addEventListener("ended", syncState);

      audio.addEventListener("error", handleError);

      void tryPlay();

      window.addEventListener("pointerdown", unlockAudio, { once: true });

      window.addEventListener("touchstart", unlockAudio, { once: true });

      window.addEventListener("keydown", unlockAudio, { once: true });

      return () => {

         window.removeEventListener("pointerdown", unlockAudio);

         window.removeEventListener("touchstart", unlockAudio);

         window.removeEventListener("keydown", unlockAudio);

         audio.removeEventListener("play", syncState);

         audio.removeEventListener("pause", syncState);

         audio.removeEventListener("ended", syncState);

         audio.removeEventListener("error", handleError);

         audio.pause();

      };

   }, []);

   const toggleAudio = async () => {

      const audio = audioRef.current;

      if (!audio) return;

      if (!audio.paused) {

         audio.pause();

         return;

      }

      try {

         await audio.play();

         setIsPlaying(true);

         setAudioError(false);

      } catch {

         setIsPlaying(false);

         setAudioError(true);

      }

   };

   return (

      <>

         <audio

            ref={audioRef}

            src="/audio/Happy Birthday Lo-Fi   3-HOUR Cozy Chill Mix (mp3cut.net).mp3"

            preload="auto"

            loop

            playsInline

            onCanPlay={() => setAudioError(false)}

         />

         <button

            type="button"

            className={`audio-toggle${audioError ? " audio-toggle--error" : ""}`}

            onClick={toggleAudio}

            aria-label={

               audioError

                  ? "Không tải được nhạc"

                  : isPlaying

                     ? "Tắt nhạc"

                     : "Bật nhạc"

            }

            title={

               audioError

                  ? "Không tải được nhạc"

                  : isPlaying

                     ? "Tắt nhạc"

                     : "Bật nhạc"

            }

         >

            <span aria-hidden="true">{audioError ? "!" : isPlaying ? "♪" : "♫"}</span>

         </button>

      </>

   );

}

type CheckInErrors = Partial<Record<"name" | "phone" | "email" | "branch" | "zalo", string>>;

function normalizePhoneInput(value: string) {

   return value.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "").slice(0, 12);

}

function validateCheckIn(form: {

   name: string;

   phone: string;

   email: string;

   branch: string;

   zalo: boolean;

}) {

   const errors: CheckInErrors = {};

   const name = form.name.trim().replace(/\s+/g, " ");

   const phone = form.phone.trim();

   const email = form.email.trim().toLowerCase();

   if (name.length < 2 || name.length > 80 || /[<>]/.test(name)) {

      errors.name = "Họ và tên chưa hợp lệ";

   }

   // Vietnamese mobile: 0 + 9 digits, or +84 + 9 digits.

   if (!/^(?:0|\+84)(?:3|5|7|8|9)\d{8}$/.test(phone)) {

      errors.phone = "Số điện thoại chưa đúng định dạng";

   }

   if (

      email.length > 254 ||

      !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) ||

      /[<>"'`\\]/.test(email)

   ) {

      errors.email = "Email chưa đúng định dạng";

   }

   if (!BRANCHES.includes(form.branch)) {

      errors.branch = "Vui lòng chọn cơ sở tham gia";

   }

   if (!form.zalo) {

      errors.zalo = "Vui lòng xác nhận trạng thái Zalo OA";

   }

   return { errors, normalized: { name, phone, email, branch: form.branch, zalo: form.zalo } };

}

function SlideToPlay({

   onComplete,

   disabled,

   loading,

}: {

   onComplete: () => void;

   disabled: boolean;

   loading: boolean;

}) {

   const trackRef = useRef<HTMLDivElement>(null);

   const draggingRef = useRef(false);

   const xRef = useRef(0);

   const [x, setX] = useState(0);

   const THUMB = 36;

   const maxX = () => Math.max(0, (trackRef.current?.offsetWidth ?? 0) - THUMB - 4);

   const setPos = (value: number) => {

      xRef.current = value;

      setX(value);

   };

   const move = (clientX: number) => {

      const track = trackRef.current;

      if (!track || disabled) return;

      const left = track.getBoundingClientRect().left;

      setPos(Math.min(Math.max(clientX - left - THUMB / 2, 0), maxX()));

   };

   const finish = () => {

      if (!draggingRef.current) return;

      draggingRef.current = false;

      const max = maxX();

      if (max > 0 && xRef.current / max >= 0.88) {

         setPos(max);

         onComplete();

         return;

      }

      setPos(0);

   };

   // Invalid form -> reset. While submitting, keep the thumb at the end.

   useEffect(() => {

      if (disabled && !loading) setPos(0);

   }, [disabled, loading]);

   // After a request finishes and the page remains here (e.g. API error), reset.

   useEffect(() => {

      if (!loading) setPos(0);

   }, [loading]);

   return (

      <div

         ref={trackRef}

         className={`slide-track${disabled && !loading ? " is-disabled" : ""}`}

         aria-disabled={disabled}

      >

         <div className="slide-fill" style={{ width: x + THUMB + 2 }} />

         <span className="slide-label">

            {loading ? "ĐANG XÁC NHẬN..." : "LƯỚT ĐỂ VÀO CHƠI →"}

         </span>

         <div

            className="slide-thumb"

            role="button"

            tabIndex={disabled ? -1 : 0}

            aria-label="Lướt để vào chơi"

            style={{ transform: `translateX(${x}px)` }}

            onPointerDown={(event) => {

               if (disabled) return;

               draggingRef.current = true;

               event.currentTarget.setPointerCapture(event.pointerId);

               move(event.clientX);

            }}

            onPointerMove={(event) => {

               if (draggingRef.current) move(event.clientX);

            }}

            onPointerUp={finish}

            onPointerCancel={finish}

            onKeyDown={(event) => {

               if (!disabled && (event.key === "Enter" || event.key === " ")) {

                  event.preventDefault();

                  onComplete();

               }

            }}

         >

            →

         </div>

      </div>

   );

}

function CheckInPage({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {

   const formRef = useRef<HTMLFormElement>(null);

   const [form, setForm] = useState({

      name: "",

      phone: "",

      email: "",

      branch: "",

      zalo: false,

   });

   const [errors, setErrors] = useState<CheckInErrors>({});

   const [message, setMessage] = useState("");

   const [isSubmitting, setIsSubmitting] = useState(false);

   const clientValidation = validateCheckIn(form);

   const valid = Object.keys(clientValidation.errors).length === 0;

   const update = (key: keyof typeof form, value: string | boolean) => {

      setForm((prev) => ({ ...prev, [key]: value }));

      setErrors((prev) => ({ ...prev, [key]: undefined }));

      setMessage("");

   };

   const submit = async (event: React.FormEvent<HTMLFormElement>) => {

      event.preventDefault();

      if (isSubmitting) return;

      const checked = validateCheckIn(form);

      if (Object.keys(checked.errors).length) {

         setErrors(checked.errors);

         return;

      }

      setIsSubmitting(true);

      setErrors({});

      setMessage("");

      try {

         const response = await fetch("/api/checkin", {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            credentials: "same-origin",

            cache: "no-store",

            body: JSON.stringify(checked.normalized),

         });

         const result = (await response.json().catch(() => ({}))) as {

            ok?: boolean;

            errors?: CheckInErrors;

            message?: string;

         };

         if (!response.ok || !result.ok) {

            if (result.errors) setErrors(result.errors);

            else setMessage(result.message || "Chưa thể xác nhận tham gia. Vui lòng thử lại.");

            return;

         }

         setMessage("Đã xác nhận thông tin tham gia.");

  onComplete();

      } catch {

         setMessage("Kết nối chưa ổn định. Vui lòng thử lại.");

      } finally {

         setIsSubmitting(false);

      }

   };

   return (

      <main className="checkin-page">

         <div className="checkin-decor" aria-hidden="true">

            <Image className="decor decor-machine" src="/images/coffee-machine.png" alt="" width={210} height={240} />

            <div className="hang hang-left-1" aria-hidden="true">

               <Image className="decor decor-hang-star" src="/images/star-big.png" alt="" width={180} height={180} />

            </div>

            <div className="hang hang-left-2" aria-hidden="true">

               <Image className="decor decor-hang-star" src="/images/star-big.png" alt="" width={180} height={180} />

            </div>

            <div className="hang hang-left-3" aria-hidden="true">

               <Image className="decor decor-hang-star" src="/images/star-big.png" alt="" width={180} height={180} />

            </div>

            <div className="hang hang-right-1" aria-hidden="true">

               <Image className="decor decor-hang-star" src="/images/star-big.png" alt="" width={180} height={180} />

            </div>

            <div className="hang hang-right-2" aria-hidden="true">

               <Image className="decor decor-hang-star" src="/images/star-big.png" alt="" width={180} height={180} />

            </div>

            <div className="hang hang-right-3" aria-hidden="true">

               <Image className="decor decor-hang-star" src="/images/star-big.png" alt="" width={180} height={180} />

            </div>

            <Image className="decor decor-cake" src="/images/cake.png" alt="" width={190} height={190} />

         </div>

         <header className="checkin-header">

            <button type="button" className="checkin-back" onClick={onBack} aria-label="Quay lại">←</button>

            <Image src="/images/logoo.png" alt="HOW Café" width={120} height={48} priority />

            <span />

         </header>

         <section className="checkin-scene">

            <div className="checkin-title">

               <p>6 NĂM · HAPPY BIRTHDAY HOW</p>

               <h1>Trước khi bắt đầu...</h1>

               <span>Hãy để HOW biết thêm về bạn<br />để gửi những phần quà đặc biệt nhé!</span>

            </div>

            <div className="paper-wrap">

               <Image

                  className="paper-image"

                  src="/images/paper.png"

                  alt=""

                  fill

                  sizes="(max-width: 430px) 96vw, 430px"

                  priority

               />

               <form ref={formRef} className="paper-content" onSubmit={submit} noValidate>

                  <div className="checkin-fields">

                     <label className={`field-group${errors.name ? " has-error" : ""}`}>

                        <span>Họ và tên</span>

                        <div className="field-control">

                           <svg className="field-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6" /></svg>

                           <input

                              value={form.name}

                              onChange={(e) => update("name", e.target.value.slice(0, 80))}

                              onBlur={() => {

                                 const next = validateCheckIn(form).errors.name;

                                 if (next) setErrors((prev) => ({ ...prev, name: next }));

                              }}

                              placeholder="Nhập họ và tên"

                              autoComplete="name"

                              maxLength={80}

                              aria-invalid={Boolean(errors.name)}

                           />

                        </div>

                        <span className="field-error" aria-live="polite">{errors.name || ""}</span>

                     </label>

                     <label className={`field-group${errors.phone ? " has-error" : ""}`}>

                        <span>Số điện thoại</span>

                        <div className="field-control">

                           <svg className="field-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.5 4.8 5.9c-.8.8-.7 2.3-.2 3.5 1.7 4.2 5.8 8.3 10 10 .9.4 2.4.7 3.4-.3l2.5-2.5-4.2-3-1.8 1.8c-2.4-1.2-4.7-3.5-5.9-5.9l1.8-1.8-3.2-4.2Z" /></svg>

                           <input

                              value={form.phone}

                              onChange={(e) => update("phone", normalizePhoneInput(e.target.value))}

                              onBlur={() => {

                                 const next = validateCheckIn(form).errors.phone;

                                 if (next) setErrors((prev) => ({ ...prev, phone: next }));

                              }}

                              placeholder="Nhập số điện thoại"

                              inputMode="tel"

                              autoComplete="tel"

                              maxLength={12}

                              aria-invalid={Boolean(errors.phone)}

                           />

                        </div>

                        <span className="field-error" aria-live="polite">{errors.phone || ""}</span>

                     </label>

                     <label className={`field-group${errors.email ? " has-error" : ""}`}>

                        <span>Email</span>

                        <div className="field-control">

                           <svg className="field-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>

                           <input

                              value={form.email}

                              onChange={(e) => update("email", e.target.value.replace(/\s/g, "").slice(0, 254))}

                              onBlur={() => {

                                 const next = validateCheckIn(form).errors.email;

                                 if (next) setErrors((prev) => ({ ...prev, email: next }));

                              }}

                              placeholder="Nhập email"

                              inputMode="email"

                              autoComplete="email"

                              maxLength={254}

                              aria-invalid={Boolean(errors.email)}

                           />

                        </div>

                        <span className="field-error" aria-live="polite">{errors.email || ""}</span>

                     </label>

                     <label className={`field-group${errors.branch ? " has-error" : ""}`}>

                        <span>Cơ sở tham gia</span>

                        <div className="field-control">

                           <svg className="field-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>

                           <select

                              value={form.branch}

                              onChange={(e) => update("branch", e.target.value)}

                              aria-invalid={Boolean(errors.branch)}

                           >

                              <option value="">Chọn cơ sở tham gia</option>

                              {BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}

                           </select>

                        </div>

                        <span className="field-error" aria-live="polite">{errors.branch || ""}</span>

                     </label>

                  </div>

                  <section className="zalo-card" aria-label="Kết nối Zalo OA">

                     <div className="zalo-qr">

                        <Image src="/images/zalo.jpg" alt="QR Zalo OA HOW Café" width={70} height={70} />

                     </div>

                     <div className="zalo-divider" aria-hidden="true" />

                     <div className="zalo-content">

                        <h2>Kết nối với HOW trên Zalo OA ♡</h2>

                        <p>Nhận thông tin sự kiện và ưu đãi mới nhất!</p>

                        <a href="https://zalo.me/howcafe" target="_blank" rel="noreferrer">Quan tâm OA ngay →</a>

                        <label className="zalo-confirm">

                           <input

                              type="checkbox"

                              checked={form.zalo}

                              onChange={(e) => update("zalo", e.target.checked)}

                           />

                           <span>Tôi đã quan tâm HOW trên Zalo OA</span>

                        </label>

                     </div>

                  </section>

                  <p className="privacy-note">

                     Thông tin của bạn chỉ được sử dụng để xác nhận tham gia và gửi thông tin/quà tặng từ HOW Café.

                  </p>

                  <SlideToPlay

                     disabled={!valid || isSubmitting}

                     loading={isSubmitting}

                     onComplete={() => formRef.current?.requestSubmit()}

                  />

                  <p className="checkin-message" aria-live="polite">{message}</p>

               </form>

            </div>

         </section>

      </main>

   );

}

const GACHA_BALLS = buildPile(4, 7).map((ball, id) => ({

   ...ball,

   id,

   src: `/images/bong${ball.sprite + 1}.png`,

   delay: -((id % 7) * 0.23),

}));

const GACHA_HANG_POSITIONS = [

   "left-1", "left-2", "left-3",

   "right-1", "right-2", "right-3",

] as const;

function GachaPage({ onBack }: { onBack: () => void }) {

   const [playing, setPlaying] = useState(false);

   const chamberRef = useRef<HTMLDivElement>(null);

   const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   useGachaPhysics(chamberRef, GACHA_BALLS, playing);

   useEffect(() => () => {

      if (playTimerRef.current) clearTimeout(playTimerRef.current);

   }, []);

   const play = () => {

      if (playing) return;

      setPlaying(true);

      if (playTimerRef.current) clearTimeout(playTimerRef.current);

      playTimerRef.current = setTimeout(() => {

         setPlaying(false);

         playTimerRef.current = null;

      }, 2600);

   };

   return (

      <main className={`gacha-page${playing ? " is-playing" : ""}`}>

         <div className="gacha-decor" aria-hidden="true">
        {GACHA_HANG_POSITIONS.map((position) => (
          <div className={`gacha-hang gacha-hang--${position}`} key={position}>
            <Image src="/images/star-big.png" alt="" width={120} height={120} />
          </div>
        ))}

        <div className="gacha-birthday-confetti">
          {Array.from({ length: 6 }, (_, index) => (
            <i
              key={index}
              className={`gacha-birthday-dot gacha-birthday-dot--${index + 1}`}
            />
          ))}
        </div>

        <Image
          className="gacha-birthday-cake"
          src="/images/cake.png"
          alt=""
          width={190}
          height={190}
        />
      </div>

      <header className="gacha-header">

            <button type="button" className="gacha-back" onClick={onBack} aria-label="Quay lại">←</button>

            <Image src="/images/logoo.png" alt="HOW Café" width={110} height={44} priority />

            <span />

         </header>

         <section className="gacha-scene">

            <div className="gacha-copy">

               <p className="gacha-eyebrow">6 NĂM · HAPPY BIRTHDAY HOW</p>

               <h1 className="gacha-title">

                  <span className="gacha-title-gacha">GACHA</span>

                  <span className="gacha-title-birthday">BIRTHDAY</span>

               </h1>

               <strong>MỜI BẠN VÀO TIỆC 🎉</strong>

               <p>HOW có chuẩn bị một món quà nhỏ cho bạn.</p>

            </div>

            <button type="button" className="gacha-machine-stage" onClick={play} aria-label="Chạm để nhận quà">

               <Image

                  className="gacha-machine-image gacha-machine-image--back"

                  src="/images/gacha-machine.png"

                  alt="Máy gacha sinh nhật HOW Café"

                  width={420}

                  height={560}

                  priority

               />

               <div className="gacha-ball-chamber" ref={chamberRef} aria-hidden="true">

                  {GACHA_BALLS.map((ball) => (

                     <Image

                        key={ball.id}

                        className={`gacha-ball ${ball.rear ? "gacha-ball--rear" : "gacha-ball--front"}`}

                        src={ball.src}

                        alt=""

                        width={88}

                        height={88}

                        style={{

                           "--x": `${ball.left}%`,

                           "--y": `${ball.top}%`,

                           "--z": ball.z,

                           "--r": `${ball.rotate}deg`,

                           "--s": ball.scale,

                           "--ball-delay": `${ball.delay}s`,

                        } as React.CSSProperties}

                     />

                  ))}

               </div>

               <Image

                  className="gacha-machine-image gacha-machine-image--front"

                  src="/images/gacha-machine.png"

                  alt=""

                  aria-hidden="true"

                  width={420}

                  height={560}

                  priority

               />

            </button>

            <button type="button" className="gacha-tap" onClick={play} disabled={playing}>

               {playing ? "ĐANG XÁO QUÀ..." : "CHẠM ĐỂ NHẬN QUÀ"}

            </button>

         </section>

      </main>

   );

}

const BRANCHES = ["Nguyễn Văn Lộc", "Nguyễn Thị Thập", "Trấn Vũ", "Láng Hạ", "Võng Thị"];

export default function Home() {

   const [screen, setScreen] = useState<"intro" | "checkin" | "gacha">("intro");

   return (

      <>

         <BirthdayAudio />

         {screen === "gacha" ? (

            <GachaPage onBack={() => setScreen("checkin")} />

         ) : screen === "checkin" ? (

            <CheckInPage

               onBack={() => setScreen("intro")}

               onComplete={() => setScreen("gacha")}

            />

         ) : (

            <main className="birthday-page">

               <section className="birthday-hero">

                  <header className="birthday-header">

                     <a href="/" className="how-logo" aria-label="HOW Café">

                        <Image

                           src="/images/logoo.png"

                           alt="HOW Café"

                           width={300}

                           height={120}

                           priority

                        />

                     </a>

                     <button

                        className="menu-button"

                        type="button"

                        aria-label="Mở menu"

                        aria-expanded="false"

                     >

                        <span />

                        <span />

                        <span />

                     </button>

                  </header>

                  <ConfettiCanvas />

                  <div className="hero-content">

                     <div className="hero-artwork hero-artwork--stacked">

                        <div className="headline">

                           <div className="headline-row">

                              <span className="headline-happy">HAPPY</span>

                              <span className="sixth">6th</span>

                           </div>

                           <h1>BIRTHDAY</h1>

                           <p className="headline-brand">HOW Café</p>

                        </div>

                        <div className="cake-stage">

                           <Image

                              className="birthday-cake"

                              src="/images/nen.png"

                              alt="Bánh sinh nhật 6 tuổi HOW Café"

                              width={900}

                              height={1100}

                              priority

                              sizes="(max-width: 430px) 96vw, 510px"

                           />

                        </div>

                     </div>

                     <div className="hero-action">

                        <button

                           type="button"

                           className="birthday-cta"

                           onClick={() => setScreen("checkin")}

                        >

                           <span className="birthday-cta-label">THAM DỰ NGAY!</span>

                           <span className="birthday-cta-arrow" aria-hidden="true">→</span>

                        </button>

                        <p className="birthday-note">

                           Sinh nhật này HOW muốn mời bạn một bữa

                           <br />

                           Bạn qua nhé?

                        </p>

                     </div>

                  </div>

               </section>

            </main>

         )}

      </>

   );

}
