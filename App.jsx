import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  User, LayoutDashboard, Dumbbell, Camera, Bell, Flame, Beef, Wheat, Droplet,
  Plus, Check, X, Loader2, ChevronRight, Home, Building2, Target, Clock,
  Moon, Utensils, Trash2, Sparkles
} from "lucide-react";

/* ---------- Design tokens ----------
  Color: --red (#E8382B) primary/power, --red-dark (#B8271C) pressed,
         --red-tint (#FDECEA) soft card bg, --ink (#1B1B1B) text,
         --paper (#FFFFFF) main bg, --mist (#F4F4F4) secondary bg,
         --green (#2E9E52) on-track, --amber (#E8A33B) caution
  Type: display = Oswald (condensed, bold, athletic), body = Inter, mono/data = Inter (tabular nums)
  Signature: concentric "power rings" gauge (calories + 3 macros) on the dashboard
------------------------------------ */

const FONT_LINK_ID = "fitness-app-fonts";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

const COLORS = {
  red: "#E8382B",
  redDark: "#B8271C",
  redTint: "#FDECEA",
  ink: "#1B1B1B",
  paper: "#FFFFFF",
  mist: "#F4F4F4",
  line: "#ECE4E3",
  green: "#2E9E52",
  amber: "#E8A33B",
  sub: "#8A7A78",
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------- Storage helpers (browser localStorage) ---------------- */
const STORE_KEY = "fitness-app-data";
async function loadAppData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function saveAppData(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("save failed", e);
  }
}

/* ---------------- Domain logic ---------------- */

function calcBMR({ gender, weight, height, age }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

const ACTIVITY_FACTORS = {
  low: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

function calcTDEE(profile) {
  return calcBMR(profile) * ACTIVITY_FACTORS[profile.activity];
}

function calcTargets(profile) {
  const tdee = calcTDEE(profile);
  let calories;
  if (profile.goal === "lose") calories = tdee - 500;
  else if (profile.goal === "gain") calories = tdee + 300;
  else calories = tdee - 150; // recomp: slight deficit, high protein

  calories = Math.max(calories, profile.gender === "male" ? 1500 : 1200);
  calories = Math.round(calories / 10) * 10;

  const proteinPerKg = profile.goal === "gain" ? 2.0 : profile.goal === "lose" ? 2.2 : 2.0;
  const protein = Math.round(profile.weight * proteinPerKg);
  const fat = Math.round((calories * 0.27) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { tdee: Math.round(tdee), calories, protein, fat, carbs };
}

const MUSCLE_LABELS = {
  chest: "อก",
  back: "หลัง",
  legs: "ขา / สะโพก",
  shoulders: "ไหล่",
  arms: "แขน",
  core: "หน้าท้อง",
  full: "ทั้งตัว",
};

const FOCUS_OPTIONS = [
  { key: "core", label: "หน้าท้อง" },
  { key: "arms", label: "แขน" },
  { key: "legs", label: "ขา / สะโพก" },
  { key: "back", label: "หลัง" },
  { key: "chest", label: "อก" },
  { key: "shoulders", label: "ไหล่" },
  { key: "full", label: "ทั้งตัว" },
];

const EXERCISES = {
  home: {
    chest: ["วิดพื้น (Push-up)", "วิดพื้นยกขาสูง (Incline Push-up)", "วิดพื้นแคบ (Diamond Push-up)"],
    back: ["ซุปเปอร์แมน (Superman)", "แขนกางหลังแอ่น (Reverse Snow Angel)", "ดึงผ้าขนหนูที่ประตู (Towel Row)"],
    legs: ["สควอทน้ำหนักตัว (Bodyweight Squat)", "ลันจ์ (Lunge)", "ยกสะโพก (Glute Bridge)", "ยกส้นเท้า (Calf Raise)"],
    shoulders: ["ไพค์พุชอัพ (Pike Push-up)", "หมุนแขนถือขวดน้ำ (Water-bottle Raise)"],
    arms: ["ดิปกับเก้าอี้ (Chair Tricep Dip)", "วิดพื้นแคบ (Diamond Push-up)", "เคิร์ลแขนถือขวดน้ำ"],
    core: ["แพลงก์ (Plank)", "บิดตัวจักรยาน (Bicycle Crunch)", "ยกขาท่านอน (Leg Raise)", "ปีนเขา (Mountain Climber)"],
    full: ["เบอร์พี (Burpee)", "สควอทถึงวิดพื้น", "กระโดดตบ (Jumping Jack)"],
  },
  gym: {
    chest: ["เบนช์เพรส (Bench Press)", "ดัมเบลอินไคลน์ (Incline Dumbbell Press)", "เคเบิลฟลาย (Cable Fly)"],
    back: ["ลัทพูลดาวน์ (Lat Pulldown)", "เคเบิลโรว์นั่ง (Seated Cable Row)", "เดดลิฟต์ (Deadlift)"],
    legs: ["สควอทบาร์เบล (Barbell Squat)", "เลกเพรส (Leg Press)", "โรมาเนียนเดดลิฟต์", "เลกเคิร์ล (Leg Curl)"],
    shoulders: ["โอเวอร์เฮดเพรส (Overhead Press)", "ยกข้าง (Lateral Raise)", "เฟซพูล (Face Pull)"],
    arms: ["บาร์เบลเคิร์ล (Barbell Curl)", "ทริเซปพูชดาวน์ (Tricep Pushdown)", "แฮมเมอร์เคิร์ล"],
    core: ["เคเบิลครันช์ (Cable Crunch)", "ยกขาห้อยบาร์ (Hanging Leg Raise)", "แพลงก์ (Plank)"],
    full: ["โรว์วิ่ง (Rowing Machine)", "สเต็ปมิลล์ (Stairmaster)", "เคทเทิลเบลสวิง"],
  },
};

function splitFocus(profile) {
  const chosen = profile.focusAreas.length ? profile.focusAreas : ["full"];
  return chosen;
}

function repsFor(goal) {
  if (goal === "gain") return { sets: 4, reps: "8-10" };
  if (goal === "lose") return { sets: 3, reps: "12-15" };
  return { sets: 3, reps: "10-12" };
}

function generateWorkoutPlan(profile) {
  const days = profile.daysPerWeek;
  const focusList = splitFocus(profile);
  const locations = profile.location === "both" ? ["home", "gym"] : [profile.location];
  const { sets, reps } = repsFor(profile.goal);
  const plan = [];

  for (let i = 0; i < days; i++) {
    const focus = focusList[i % focusList.length];
    const loc = locations[i % locations.length];
    const bank = EXERCISES[loc][focus] || EXERCISES[loc].full;
    let exList = bank.slice(0, 4).map((name) => ({ name, sets, reps }));

    if (focus === "full") {
      const groups = ["chest", "back", "legs", "core"];
      exList = groups.map((g) => ({
        name: EXERCISES[loc][g][0],
        sets,
        reps,
      }));
    }

    const includeCardio = profile.goal !== "gain";
    if (includeCardio) {
      const cardioBank = EXERCISES[loc].full;
      exList.push({ name: cardioBank[cardioBank.length - 1], sets: 1, reps: "10-15 นาที" });
    }

    plan.push({
      day: i + 1,
      focus,
      location: loc,
      exercises: exList,
    });
  }
  return plan;
}

/* ---------------- Food photo analysis (via our own serverless proxy) ----------------
   The browser calls OUR /api/analyze-food function (see /api/analyze-food.js), which
   holds the ANTHROPIC_API_KEY server-side and forwards the request to Claude.
   Never call api.anthropic.com directly from client-side code — that would expose
   your API key to anyone who opens devtools. */
async function analyzeFoodPhoto(base64Data, mediaType) {
  const res = await fetch("/api/analyze-food", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Data, mediaType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "analyze-food request failed");
  }
  return res.json();
}

/* ---------------- Small UI atoms ---------------- */

function Ring({ pct, color, size, stroke, children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.mist} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - clamped)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "8px 0 6px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: active ? COLORS.red : COLORS.sub,
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 2} />
      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function PillOption({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 14px",
        borderRadius: 999,
        border: `1.5px solid ${active ? COLORS.red : COLORS.line}`,
        background: active ? COLORS.red : COLORS.paper,
        color: active ? "#fff" : COLORS.ink,
        fontFamily: "Inter, sans-serif",
        fontWeight: 600,
        fontSize: 13.5,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "Oswald, sans-serif",
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: COLORS.red,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- Onboarding ---------------- */

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    gender: "male",
    age: 25,
    height: 170,
    weight: 65,
    activity: "light",
    goal: "lose",
    focusAreas: [],
    location: "home",
    daysPerWeek: 4,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleFocus = (key) => {
    setForm((f) => {
      const has = f.focusAreas.includes(key);
      return { ...f, focusAreas: has ? f.focusAreas.filter((x) => x !== key) : [...f.focusAreas, key] };
    });
  };

  const steps = [
    {
      title: "สวัสดีครับ",
      body: (
        <>
          <p style={{ fontFamily: "Inter", color: COLORS.sub, marginBottom: 16, lineHeight: 1.6 }}>
            มาเริ่มสร้างโปรแกรมที่ออกแบบมาเฉพาะคุณกันครับ ขอข้อมูลพื้นฐานก่อน
          </p>
          <label style={labelStyle}>ชื่อเล่น</label>
          <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="เช่น เชน" />
          <label style={labelStyle}>เพศ</label>
          <div style={{ display: "flex", gap: 8 }}>
            <PillOption active={form.gender === "male"} onClick={() => set("gender", "male")}>ชาย</PillOption>
            <PillOption active={form.gender === "female"} onClick={() => set("gender", "female")}>หญิง</PillOption>
          </div>
        </>
      ),
    },
    {
      title: "ตัวเลขของคุณ",
      body: (
        <>
          <label style={labelStyle}>อายุ (ปี)</label>
          <input type="number" style={inputStyle} value={form.age} onChange={(e) => set("age", +e.target.value)} />
          <label style={labelStyle}>ส่วนสูง (ซม.)</label>
          <input type="number" style={inputStyle} value={form.height} onChange={(e) => set("height", +e.target.value)} />
          <label style={labelStyle}>น้ำหนักปัจจุบัน (กก.)</label>
          <input type="number" style={inputStyle} value={form.weight} onChange={(e) => set("weight", +e.target.value)} />
          <label style={labelStyle}>ระดับกิจกรรมในแต่ละวัน</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              ["low", "นั่งทำงานเป็นหลัก"],
              ["light", "ขยับตัวเล็กน้อย"],
              ["moderate", "เคลื่อนไหวปานกลาง"],
              ["high", "ใช้แรงงาน/กระฉับกระเฉง"],
            ].map(([k, label]) => (
              <PillOption key={k} active={form.activity === k} onClick={() => set("activity", k)}>{label}</PillOption>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "หุ่นในฝันของคุณ",
      body: (
        <>
          <label style={labelStyle}>เป้าหมายหลัก</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {[
              ["lose", "ลดไขมัน / ลดน้ำหนัก"],
              ["gain", "เพิ่มกล้ามเนื้อ"],
              ["recomp", "ลดไขมัน + เพิ่มกล้ามไปพร้อมกัน"],
            ].map(([k, label]) => (
              <PillOption key={k} active={form.goal === k} onClick={() => set("goal", k)}>{label}</PillOption>
            ))}
          </div>
          <label style={labelStyle}>อยากเน้นดูแลส่วนไหนเป็นพิเศษ (เลือกได้หลายข้อ)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {FOCUS_OPTIONS.map((f) => (
              <PillOption key={f.key} active={form.focusAreas.includes(f.key)} onClick={() => toggleFocus(f.key)}>
                {f.label}
              </PillOption>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "สถานที่และความถี่",
      body: (
        <>
          <label style={labelStyle}>ออกกำลังกายที่ไหนเป็นหลัก</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              ["home", "ที่บ้าน", Home],
              ["gym", "ฟิตเนส/ยิม", Building2],
              ["both", "ทั้งสองที่", Sparkles],
            ].map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => set("location", k)}
                style={{
                  flex: 1,
                  padding: "14px 8px",
                  borderRadius: 14,
                  border: `1.5px solid ${form.location === k ? COLORS.red : COLORS.line}`,
                  background: form.location === k ? COLORS.redTint : COLORS.paper,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                <Icon size={20} color={form.location === k ? COLORS.red : COLORS.sub} />
                <span style={{ fontFamily: "Inter", fontSize: 12.5, fontWeight: 600, color: COLORS.ink }}>{label}</span>
              </button>
            ))}
          </div>
          <label style={labelStyle}>ออกกำลังกายกี่วันต่อสัปดาห์</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[3, 4, 5, 6].map((d) => (
              <PillOption key={d} active={form.daysPerWeek === d} onClick={() => set("daysPerWeek", d)}>
                {d} วัน
              </PillOption>
            ))}
          </div>
        </>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div style={{ minHeight: "100%", background: COLORS.paper, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "22px 20px 8px" }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? COLORS.red : COLORS.mist,
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 26, color: COLORS.ink, margin: 0 }}>
          {steps[step].title}
        </h1>
      </div>
      <div style={{ flex: 1, padding: "10px 20px", overflowY: "auto" }}>{steps[step].body}</div>
      <div style={{ padding: 20, display: "flex", gap: 10 }}>
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} style={{ ...secondaryBtn, flex: "0 0 90px" }}>
            ย้อนกลับ
          </button>
        )}
        <button
          onClick={() => (isLast ? onComplete(form) : setStep((s) => s + 1))}
          style={{ ...primaryBtn, flex: 1 }}
        >
          {isLast ? "สร้างโปรแกรมของฉัน" : "ถัดไป"}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontFamily: "Inter, sans-serif",
  fontWeight: 600,
  fontSize: 12.5,
  color: COLORS.sub,
  marginBottom: 8,
  marginTop: 14,
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1.5px solid ${COLORS.line}`,
  fontFamily: "Inter, sans-serif",
  fontSize: 15,
  color: COLORS.ink,
  outline: "none",
  boxSizing: "border-box",
  marginBottom: 4,
};

const primaryBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "14px 18px",
  borderRadius: 14,
  border: "none",
  background: COLORS.red,
  color: "#fff",
  fontFamily: "Inter, sans-serif",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "14px 18px",
  borderRadius: 14,
  border: `1.5px solid ${COLORS.line}`,
  background: COLORS.paper,
  color: COLORS.ink,
  fontFamily: "Inter, sans-serif",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
};

/* ---------------- Dashboard ---------------- */

function Dashboard({ profile, targets, todayEntries, onGoScan }) {
  const consumed = todayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fat: acc.fat + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = targets.calories - consumed.calories;
  const pct = consumed.calories / targets.calories;

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <div style={{ fontFamily: "Inter", color: COLORS.sub, fontSize: 13.5 }}>สวัสดี{profile.name ? ` ${profile.name}` : ""} 👋</div>
      <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 24, margin: "2px 0 20px", color: COLORS.ink }}>
        วันนี้ของคุณ
      </h1>

      <div
        style={{
          background: COLORS.ink,
          borderRadius: 20,
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}>
          <Ring pct={pct} color={COLORS.red} size={110} stroke={10} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Flame size={16} color={COLORS.red} />
            <span style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 20, color: "#fff" }}>
              {Math.max(0, Math.round(remaining))}
            </span>
            <span style={{ fontFamily: "Inter", fontSize: 10, color: "#B8B0AF" }}>แคลคงเหลือ</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#B8B0AF", marginBottom: 4 }}>เป้าหมายวันนี้</div>
          <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 22, color: "#fff" }}>{targets.calories} kcal</div>
          <div style={{ fontFamily: "Inter", fontSize: 12.5, color: "#B8B0AF", marginTop: 6 }}>
            กินไปแล้ว {Math.round(consumed.calories)} kcal
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <MacroCard icon={Beef} label="โปรตีน" value={consumed.protein} target={targets.protein} color={COLORS.red} />
        <MacroCard icon={Wheat} label="คาร์บ" value={consumed.carbs} target={targets.carbs} color={COLORS.amber} />
        <MacroCard icon={Droplet} label="ไขมัน" value={consumed.fat} target={targets.fat} color={COLORS.sub} />
      </div>

      <button onClick={onGoScan} style={{ ...primaryBtn, width: "100%", marginBottom: 24 }}>
        <Camera size={18} /> สแกนแคลจากรูปอาหาร
      </button>

      <SectionLabel>รายการอาหารวันนี้</SectionLabel>
      {todayEntries.length === 0 && (
        <div style={{ fontFamily: "Inter", color: COLORS.sub, fontSize: 14, padding: "12px 0" }}>
          ยังไม่มีรายการ ลองถ่ายรูปมื้ออาหารแรกของวันนี้ดูครับ
        </div>
      )}
      {todayEntries.map((e) => (
        <div
          key={e.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            background: COLORS.mist,
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{e.food_name}</div>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.sub }}>{e.portion_note}</div>
          </div>
          <div style={{ fontFamily: "Oswald", fontWeight: 600, fontSize: 15, color: COLORS.red }}>{Math.round(e.calories)} kcal</div>
        </div>
      ))}
    </div>
  );
}

function MacroCard({ icon: Icon, label, value, target, color }) {
  const pct = Math.min(1, value / Math.max(1, target));
  return (
    <div style={{ flex: 1, background: COLORS.mist, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
      <Icon size={16} color={color} style={{ marginBottom: 4 }} />
      <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 15, color: COLORS.ink }}>
        {Math.round(value)}<span style={{ fontSize: 11, color: COLORS.sub, fontFamily: "Inter" }}>/{target}g</span>
      </div>
      <div style={{ fontFamily: "Inter", fontSize: 10.5, color: COLORS.sub, marginBottom: 6 }}>{label}</div>
      <div style={{ height: 4, borderRadius: 2, background: "#E6DEDD", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct * 100}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

/* ---------------- Workout tab ---------------- */

function WorkoutTab({ plan }) {
  const [openDay, setOpenDay] = useState(1);
  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 24, margin: "2px 0 4px", color: COLORS.ink }}>
        โปรแกรมของคุณ
      </h1>
      <p style={{ fontFamily: "Inter", color: COLORS.sub, fontSize: 13.5, marginBottom: 18 }}>
        {plan.length} วันต่อสัปดาห์ ออกแบบตามเป้าหมายและสถานที่ที่คุณเลือก
      </p>
      {plan.map((d) => {
        const open = openDay === d.day;
        return (
          <div key={d.day} style={{ marginBottom: 10, borderRadius: 16, overflow: "hidden", border: `1.5px solid ${COLORS.line}` }}>
            <button
              onClick={() => setOpenDay(open ? null : d.day)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: open ? COLORS.redTint : COLORS.paper,
                border: "none",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: COLORS.red,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Oswald",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {d.day}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 14.5, color: COLORS.ink }}>
                    {MUSCLE_LABELS[d.focus]}
                  </div>
                  <div style={{ fontFamily: "Inter", fontSize: 11.5, color: COLORS.sub }}>
                    {d.location === "home" ? "ที่บ้าน" : "ฟิตเนส/ยิม"}
                  </div>
                </div>
              </div>
              <ChevronRight
                size={18}
                color={COLORS.sub}
                style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
              />
            </button>
            {open && (
              <div style={{ padding: "4px 16px 14px" }}>
                {d.exercises.map((ex, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderTop: i > 0 ? `1px solid ${COLORS.line}` : "none",
                    }}
                  >
                    <span style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.ink }}>{ex.name}</span>
                    <span style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.sub, fontWeight: 600 }}>
                      {ex.sets} เซ็ต × {ex.reps}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Food scan tab ---------------- */

function FoodScanTab({ onLogged }) {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setLoading(true);
      try {
        const analysis = await analyzeFoodPhoto(base64, file.type || "image/jpeg");
        setResult(analysis);
      } catch (e) {
        setError("วิเคราะห์รูปไม่สำเร็จ ลองถ่ายให้เห็นอาหารชัดเจนขึ้นแล้วลองใหม่ครับ");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const confirmLog = () => {
    onLogged({ id: uid(), time: new Date().toISOString(), ...result });
    setPreview(null);
    setResult(null);
  };

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 24, margin: "2px 0 4px", color: COLORS.ink }}>
        สแกนอาหาร
      </h1>
      <p style={{ fontFamily: "Inter", color: COLORS.sub, fontSize: 13.5, marginBottom: 18 }}>
        ถ่ายรูปหรืออัพโหลดรูปอาหาร ให้ AI ประเมินแคลอรี่และสารอาหารให้
      </p>

      {!preview && (
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            aspectRatio: "1.4",
            borderRadius: 20,
            border: `2px dashed ${COLORS.red}`,
            background: COLORS.redTint,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <Camera size={34} color={COLORS.red} />
          <span style={{ fontFamily: "Inter", fontWeight: 700, color: COLORS.red }}>แตะเพื่อถ่ายรูปอาหาร</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {preview && (
        <div style={{ borderRadius: 20, overflow: "hidden", marginBottom: 16 }}>
          <img src={preview} alt="อาหารที่ถ่าย" style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }} />
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", padding: 20 }}>
          <Loader2 className="spin" size={20} color={COLORS.red} />
          <span style={{ fontFamily: "Inter", color: COLORS.sub, fontSize: 14 }}>กำลังวิเคราะห์รูปอาหาร...</span>
          <style>{`.spin { animation: spin 1s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {error && (
        <div style={{ fontFamily: "Inter", color: COLORS.red, fontSize: 13.5, padding: "10px 0" }}>{error}</div>
      )}

      {result && (
        <div style={{ background: COLORS.mist, borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 17, color: COLORS.ink, marginBottom: 2 }}>
            {result.food_name}
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 12.5, color: COLORS.sub, marginBottom: 12 }}>{result.portion_note}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <StatChip label="แคล" value={`${Math.round(result.calories)}`} color={COLORS.red} />
            <StatChip label="โปรตีน" value={`${Math.round(result.protein_g)}g`} color={COLORS.ink} />
            <StatChip label="คาร์บ" value={`${Math.round(result.carbs_g)}g`} color={COLORS.amber} />
            <StatChip label="ไขมัน" value={`${Math.round(result.fat_g)}g`} color={COLORS.sub} />
          </div>
        </div>
      )}

      {result && (
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              setPreview(null);
              setResult(null);
            }}
            style={{ ...secondaryBtn, flex: 1 }}
          >
            <X size={16} style={{ marginRight: 4 }} /> ถ่ายใหม่
          </button>
          <button onClick={confirmLog} style={{ ...primaryBtn, flex: 1 }}>
            <Check size={16} /> บันทึกมื้อนี้
          </button>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ fontFamily: "Oswald", fontWeight: 700, fontSize: 15, color }}>{value}</div>
      <div style={{ fontFamily: "Inter", fontSize: 10.5, color: COLORS.sub }}>{label}</div>
    </div>
  );
}

/* ---------------- Reminders tab ---------------- */

function ReminderRow({ icon: Icon, label, time, enabled, onTime, onToggle, onDelete }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: COLORS.mist,
        borderRadius: 14,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: enabled ? COLORS.redTint : "#E6E1E0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={17} color={enabled ? COLORS.red : COLORS.sub} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{label}</div>
        <input
          type="time"
          value={time}
          onChange={(e) => onTime(e.target.value)}
          style={{
            fontFamily: "Inter",
            fontSize: 13,
            color: COLORS.sub,
            border: "none",
            background: "transparent",
            padding: 0,
          }}
        />
      </div>
      <label style={{ position: "relative", display: "inline-block", width: 40, height: 22 }}>
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} style={{ display: "none" }} />
        <span
          onClick={() => onToggle(!enabled)}
          style={{
            position: "absolute",
            inset: 0,
            background: enabled ? COLORS.red : "#D8D2D1",
            borderRadius: 999,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: enabled ? 20 : 2,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
            }}
          />
        </span>
      </label>
      {onDelete && (
        <button onClick={onDelete} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
          <Trash2 size={16} color={COLORS.sub} />
        </button>
      )}
    </div>
  );
}

function RemindersTab({ reminders, setReminders, notifStatus, requestNotif }) {
  const updateMeal = (id, patch) => {
    setReminders((r) => ({ ...r, meals: r.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  };
  const addMeal = () => {
    setReminders((r) => ({
      ...r,
      meals: [...r.meals, { id: uid(), label: `มื้ออาหาร ${r.meals.length + 1}`, time: "12:00", enabled: true }],
    }));
  };
  const removeMeal = (id) => {
    setReminders((r) => ({ ...r, meals: r.meals.filter((m) => m.id !== id) }));
  };

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 24, margin: "2px 0 4px", color: COLORS.ink }}>
        การแจ้งเตือน
      </h1>
      <p style={{ fontFamily: "Inter", color: COLORS.sub, fontSize: 13, marginBottom: 16 }}>
        แจ้งเตือนจะทำงานเมื่อเปิดหน้านี้ค้างไว้ในเบราว์เซอร์
      </p>

      {notifStatus !== "granted" && (
        <button onClick={requestNotif} style={{ ...secondaryBtn, width: "100%", marginBottom: 18, borderColor: COLORS.red, color: COLORS.red }}>
          <Bell size={16} style={{ marginRight: 6 }} /> เปิดใช้งานการแจ้งเตือนของเบราว์เซอร์
        </button>
      )}

      <SectionLabel>มื้ออาหาร</SectionLabel>
      {reminders.meals.map((m) => (
        <ReminderRow
          key={m.id}
          icon={Utensils}
          label={m.label}
          time={m.time}
          enabled={m.enabled}
          onTime={(t) => updateMeal(m.id, { time: t })}
          onToggle={(v) => updateMeal(m.id, { enabled: v })}
          onDelete={() => removeMeal(m.id)}
        />
      ))}
      <button onClick={addMeal} style={{ ...secondaryBtn, width: "100%", marginBottom: 20 }}>
        <Plus size={16} style={{ marginRight: 6 }} /> เพิ่มมื้ออาหาร
      </button>

      <SectionLabel>การนอน</SectionLabel>
      <ReminderRow
        icon={Moon}
        label="เข้านอน"
        time={reminders.sleep.time}
        enabled={reminders.sleep.enabled}
        onTime={(t) => setReminders((r) => ({ ...r, sleep: { ...r.sleep, time: t } }))}
        onToggle={(v) => setReminders((r) => ({ ...r, sleep: { ...r.sleep, enabled: v } }))}
      />

      <div style={{ marginTop: 12 }}>
        <SectionLabel>ออกกำลังกาย</SectionLabel>
        <ReminderRow
          icon={Dumbbell}
          label="เวลาออกกำลังกาย"
          time={reminders.workout.time}
          enabled={reminders.workout.enabled}
          onTime={(t) => setReminders((r) => ({ ...r, workout: { ...r.workout, time: t } }))}
          onToggle={(v) => setReminders((r) => ({ ...r, workout: { ...r.workout, enabled: v } }))}
        />
      </div>
    </div>
  );
}

/* ---------------- App root ---------------- */

const DEFAULT_REMINDERS = {
  meals: [
    { id: uid(), label: "มื้อเช้า", time: "07:30", enabled: true },
    { id: uid(), label: "มื้อกลางวัน", time: "12:00", enabled: true },
    { id: uid(), label: "มื้อเย็น", time: "18:30", enabled: true },
  ],
  sleep: { time: "23:00", enabled: true },
  workout: { time: "17:30", enabled: true },
};

export default function App() {
  useFonts();
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [foodLog, setFoodLog] = useState({});
  const [reminders, setReminders] = useState(DEFAULT_REMINDERS);
  const [tab, setTab] = useState("dashboard");
  const [notifStatus, setNotifStatus] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const [banner, setBanner] = useState(null);
  const firedToday = useRef(new Set());

  useEffect(() => {
    (async () => {
      const data = await loadAppData();
      if (data) {
        setProfile(data.profile || null);
        setFoodLog(data.foodLog || {});
        setReminders(data.reminders || DEFAULT_REMINDERS);
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveAppData({ profile, foodLog, reminders });
  }, [loaded, profile, foodLog, reminders]);

  const requestNotif = useCallback(() => {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setNotifStatus);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const dayKey = `${todayStr()}-${hhmm}`;

      const checks = [
        ...reminders.meals.map((m) => ({ key: `meal-${m.id}`, time: m.time, enabled: m.enabled, text: `ถึงเวลา${m.label}แล้ว 🍽️` })),
        { key: "sleep", time: reminders.sleep.time, enabled: reminders.sleep.enabled, text: "ใกล้เวลาเข้านอนแล้ว หลับให้เพียงพอเพื่อฟื้นฟูร่างกาย 🌙" },
        { key: "workout", time: reminders.workout.time, enabled: reminders.workout.enabled, text: "ถึงเวลาออกกำลังกายแล้ว 💪" },
      ];

      checks.forEach((c) => {
        if (c.enabled && c.time === hhmm) {
          const fireKey = `${c.key}-${dayKey}`;
          if (!firedToday.current.has(fireKey)) {
            firedToday.current.add(fireKey);
            setBanner(c.text);
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("แอพออกกำลังกาย", { body: c.text });
            }
            setTimeout(() => setBanner(null), 8000);
          }
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [reminders]);

  if (!loaded) {
    return (
      <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.paper }}>
        <Loader2 className="spin" size={26} color={COLORS.red} />
        <style>{`.spin { animation: spin 1s linear infinite } @keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", background: COLORS.paper, minHeight: 560, borderRadius: 20, overflow: "hidden" }}>
        <Onboarding
          onComplete={(form) => {
            setProfile(form);
            setTab("dashboard");
          }}
        />
      </div>
    );
  }

  const targets = calcTargets(profile);
  const plan = generateWorkoutPlan(profile);
  const entries = foodLog[todayStr()] || [];

  const addFoodEntry = (entry) => {
    setFoodLog((log) => ({ ...log, [todayStr()]: [...(log[todayStr()] || []), entry] }));
    setTab("dashboard");
  };

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "0 auto",
        background: COLORS.paper,
        minHeight: 560,
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 0 0 1px " + COLORS.line,
      }}
    >
      {banner && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 10,
            background: COLORS.red,
            color: "#fff",
            padding: "12px 14px",
            borderRadius: 12,
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 20px rgba(232,56,43,0.35)",
          }}
        >
          <Bell size={16} /> {banner}
        </div>
      )}

      <div style={{ overflowY: "auto", maxHeight: 620 }}>
        {tab === "dashboard" && (
          <Dashboard profile={profile} targets={targets} todayEntries={entries} onGoScan={() => setTab("scan")} />
        )}
        {tab === "workout" && <WorkoutTab plan={plan} />}
        {tab === "scan" && <FoodScanTab onLogged={addFoodEntry} />}
        {tab === "reminders" && (
          <RemindersTab reminders={reminders} setReminders={setReminders} notifStatus={notifStatus} requestNotif={requestNotif} />
        )}
        {tab === "profile" && (
          <div style={{ padding: 20 }}>
            <h1 style={{ fontFamily: "Oswald, sans-serif", fontWeight: 700, fontSize: 24, color: COLORS.ink }}>โปรไฟล์</h1>
            <div style={{ background: COLORS.mist, borderRadius: 16, padding: 16, marginTop: 12, marginBottom: 16 }}>
              <Row label="น้ำหนัก" value={`${profile.weight} กก.`} />
              <Row label="ส่วนสูง" value={`${profile.height} ซม.`} />
              <Row label="อายุ" value={`${profile.age} ปี`} />
              <Row label="เป้าหมาย" value={profile.goal === "lose" ? "ลดไขมัน" : profile.goal === "gain" ? "เพิ่มกล้ามเนื้อ" : "ลดไขมัน + เพิ่มกล้าม"} />
              <Row label="เน้นส่วน" value={profile.focusAreas.length ? profile.focusAreas.map((f) => MUSCLE_LABELS[f]).join(", ") : "ทั้งตัว"} />
              <Row label="สถานที่" value={profile.location === "home" ? "ที่บ้าน" : profile.location === "gym" ? "ฟิตเนส/ยิม" : "ทั้งสองที่"} />
              <Row label="แคลอรี่เป้าหมาย" value={`${targets.calories} kcal/วัน`} last />
            </div>
            <button
              onClick={() => setProfile(null)}
              style={{ ...secondaryBtn, width: "100%", color: COLORS.red, borderColor: COLORS.red }}
            >
              แก้ไขข้อมูลใหม่ทั้งหมด
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${COLORS.line}`,
          background: COLORS.paper,
          position: "sticky",
          bottom: 0,
        }}
      >
        <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={LayoutDashboard} label="แดชบอร์ด" />
        <TabButton active={tab === "workout"} onClick={() => setTab("workout")} icon={Dumbbell} label="โปรแกรม" />
        <TabButton active={tab === "scan"} onClick={() => setTab("scan")} icon={Camera} label="สแกน" />
        <TabButton active={tab === "reminders"} onClick={() => setTab("reminders")} icon={Bell} label="แจ้งเตือน" />
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={User} label="โปรไฟล์" />
      </div>
    </div>
  );
}

function Row({ label, value, last }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "9px 0",
        borderBottom: last ? "none" : `1px solid ${COLORS.line}`,
      }}
    >
      <span style={{ fontFamily: "Inter", fontSize: 13.5, color: COLORS.sub }}>{label}</span>
      <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 13.5, color: COLORS.ink }}>{value}</span>
    </div>
  );
}
