import React, { useState, useEffect, useRef } from "react";
import { db } from "./lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  Trophy,
  Users,
  ShoppingCart,
  Wrench,
  Lock,
  Image as ImageIcon,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MASTER_PASS = "cisweb08090420074080";

// --- Types ---
interface Tournament {
  id: string;
  name: string;
  date: string;
  prize: string;
  mode: string;
  orgs: string[];
  description: string;
  banner?: string;
  logo?: string;
}

interface Team {
  id: string;
  name: string;
  captain: string;
  banner: string;
  logo: string;
  age: string;
  link: string;
  description: string;
}

interface Shop {
  id: string;
  name: string;
  banner: string;
  logo: string;
  prices: string;
  type: "donate" | "custom" | "accounts" | "standard";
  // Donate specific fields
  nickname?: string;
  carsCount?: string;
  credits?: string;
}

interface Build {
  id: string;
  type: "free" | "paid";
  nickname: string;
  carImage: string;
  link: string;
}

// --- Components ---

const GlassCard = ({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "bg-[rgba(20,20,25,0.6)] backdrop-blur-[30px] border border-[rgba(255,255,255,0.04)] rounded-2xl shadow-2xl transition-transform active:scale-[0.98]",
      className,
    )}
  >
    {children}
  </div>
);

const ImageUpload = ({
  onUpload,
  preview,
  label,
}: {
  onUpload: (base64: string) => void;
  preview?: string;
  label: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX = 1200;
        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else {
          if (height > MAX) {
            width *= MAX / height;
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        onUpload(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="w-full h-32 border border-dashed border-white/10 rounded-xl bg-white/2 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition group overflow-hidden relative"
    >
      {preview ? (
        <>
          <img
            src={preview}
            className="w-full h-full object-cover"
            alt="preview"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <ImageIcon className="text-white" />
          </div>
        </>
      ) : (
        <>
          <ImageIcon className="text-gray-500 mb-2" size={24} />
          <span className="text-xs text-gray-500 font-medium uppercase tracking-widest">
            {label}
          </span>
        </>
      )}
      <input
        type="file"
        ref={inputRef}
        onChange={handleFile}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<
    "tournaments" | "teams" | "shops" | "builds" | "admin"
  >("tournaments");
  const [buildSubtab, setBuildSubtab] = useState<"free" | "paid">("free");
  const [shopSubtab, setShopSubtab] = useState<
    "donate" | "custom" | "accounts" | "standard"
  >("standard");
  const [isAdmin, setIsAdmin] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);
  const [deleteId, setDeleteId] = useState<{ col: string; id: string } | null>(
    null,
  );
  const [editItem, setEditItem] = useState<{ col: string; id: string } | null>(
    null,
  );

  // Data State
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [builds, setBuilds] = useState<Build[]>([]);

  // Admin Form States
  const [tForm, setTForm] = useState({
    name: "",
    date: "",
    prize: "",
    mode: "drift",
    orgs: "",
    desc: "",
    banner: "",
    logo: "",
  });
  const [teamForm, setTeamForm] = useState({
    name: "",
    captain: "",
    banner: "",
    logo: "",
    age: "16+",
    link: "",
    desc: "",
  });
  const [shopForm, setShopForm] = useState({
    name: "",
    banner: "",
    logo: "",
    prices: "",
    type: "standard" as any,
    nickname: "",
    carsCount: "",
    credits: "",
  });
  const [buildForm, setBuildForm] = useState({
    type: "free" as const,
    nickname: "",
    carImage: "",
    link: "",
  });

  useEffect(() => {
    const unsubT = onSnapshot(
      query(collection(db, "tournaments"), orderBy("createdAt", "desc")),
      (snap) => {
        setTournaments(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tournament),
        );
      },
    );
    const unsubTeams = onSnapshot(
      query(collection(db, "teams"), orderBy("createdAt", "desc")),
      (snap) => {
        setTeams(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Team));
      },
    );
    const unsubShops = onSnapshot(
      query(collection(db, "shops"), orderBy("createdAt", "desc")),
      (snap) => {
        setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Shop));
      },
    );
    const unsubBuilds = onSnapshot(
      query(collection(db, "builds"), orderBy("createdAt", "desc")),
      (snap) => {
        setBuilds(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Build));
      },
    );

    // Instant loader exit for better UX
    const loaderTimer = setTimeout(() => setLoading(false), 300);

    return () => {
      unsubT();
      unsubTeams();
      unsubShops();
      unsubBuilds();
      clearTimeout(loaderTimer);
    };
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdminAuth = () => {
    if (passInput === MASTER_PASS) {
      setIsAdmin(true);
      showToast("Админ-панель открыта");
    } else {
      showToast("Неверный пароль", "error");
    }
  };

  const addItem = async (col: string, data: any) => {
    try {
      if (!data.name && !data.nickname) {
        showToast("Заполните название", "error");
        return;
      }

      if (editItem && editItem.col === col) {
        // Update existing
        const { id, ...cleanData } = data; // Remove ID if present in data
        await setDoc(
          doc(db, col, editItem.id),
          {
            ...cleanData,
            updatedAt: Timestamp.now(),
          },
          { merge: true },
        );
        showToast("Обновлено!");
        setEditItem(null);
      } else {
        // Add new
        await addDoc(collection(db, col), {
          ...data,
          createdAt: Timestamp.now(),
        });
        showToast("Опубликовано!");
      }
    } catch (e: any) {
      console.error("Firebase Error:", e);
      showToast(`Ошибка: Настройте базу данных в консоли`, "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, deleteId.col, deleteId.id));
      showToast("Удалено");
      setDeleteId(null);
    } catch (e) {
      showToast("Ошибка при удалении", "error");
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen text-white pb-32">
      {/* --- Toast Notification --- */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%" }}
            className={cn(
              "fixed top-6 left-1/2 z-[10000] px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl border border-white/10",
              notification.type === "success"
                ? "bg-emerald-500/90 backdrop-blur-md"
                : "bg-red-500/90 backdrop-blur-md",
            )}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Delete Confirmation Modal --- */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0a0a10] border border-white/5 p-8 rounded-3xl w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-bold mb-2">Удалить элемент?</h3>
              <p className="text-gray-500 text-xs mb-8 uppercase tracking-widest leading-loose">
                Это действие удалит контент у всех пользователей навсегда.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="py-4 bg-white/5 rounded-2xl text-[10px] uppercase font-bold tracking-widest"
                >
                  Отмена
                </button>
                <button
                  onClick={confirmDelete}
                  className="py-4 bg-red-500 text-white rounded-2xl text-[10px] uppercase font-bold tracking-widest"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-12 px-6 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">CIS Hub</h1>
        <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-1">
          Independent Gaming Community
        </p>
      </header>

      <main className="px-5">
        <AnimatePresence mode="wait">
          {activeTab === "tournaments" && (
            <motion.div
              key="tournaments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Trophy size={20} className="text-blue-400" /> Турниры
              </h2>
              <div className="space-y-6">
                {tournaments.map((t) => (
                  <GlassCard key={t.id} className="!p-0 overflow-hidden">
                    {t.banner && (
                      <img
                        src={t.banner}
                        className="h-40 w-full object-cover"
                        alt="banner"
                      />
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 items-center">
                          {t.logo && (
                            <img
                              src={t.logo}
                              className="w-12 h-12 rounded-xl object-cover border border-white/5 shadow-lg"
                              alt="logo"
                            />
                          )}
                          <div>
                            <h3 className="text-lg font-bold leading-tight">
                              {t.name}
                            </h3>
                            <p className="text-blue-400 text-xs font-medium">
                              {t.date}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold px-3 py-1 rounded-full border border-white/10 uppercase tracking-widest bg-white/5">
                          {t.mode}
                        </span>
                      </div>

                      <div className="mb-4">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">
                          Призовой фонд
                        </span>
                        <p className="text-emerald-400 text-lg font-black">
                          {t.prize}
                        </p>
                      </div>

                      <p className="text-gray-400 text-sm mb-6 leading-relaxed line-clamp-3">
                        {t.desc}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {t.orgs.map((o, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded-md text-gray-400"
                          >
                            @{o.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "teams" && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Users size={20} className="text-yellow-400" /> Команды
              </h2>
              <div className="space-y-6">
                {teams.map((t) => (
                  <GlassCard key={t.id} className="!p-0 overflow-hidden">
                    <img
                      src={t.banner}
                      className="h-32 w-full object-cover"
                      alt="banner"
                    />
                    <div className="-mt-10 ml-6 relative">
                      <img
                        src={t.logo}
                        className="w-20 h-20 rounded-full border-4 border-[#05050b] bg-black object-cover shadow-xl"
                        alt="logo"
                      />
                    </div>
                    <div className="px-6 pb-6 pt-3">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-xl font-bold">{t.name}</h3>
                        <span className="text-[10px] text-gray-500 border border-white/10 px-2 py-0.5 rounded uppercase">
                          {t.age}
                        </span>
                      </div>
                      <p className="text-blue-400 text-xs mb-3 font-medium">
                        Captain: {t.captain}
                      </p>
                      <p className="text-gray-400 text-sm mb-5 leading-relaxed truncate-3">
                        {t.desc}
                      </p>
                      <button
                        onClick={() => window.open(t.link)}
                        className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-bold text-sm tracking-wide text-white active:bg-white/10 transition"
                      >
                        Связаться
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "shops" && (
            <motion.div
              key="shops"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShoppingCart size={20} className="text-green-400" /> Магазины
              </h2>

              <div className="flex bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                {[
                  { id: "standard", label: "Обычные" },
                  { id: "donate", label: "Донат" },
                  { id: "custom", label: "Билды на заказ" },
                  { id: "accounts", label: "Аккаунты" },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setShopSubtab(sub.id as any)}
                    className={cn(
                      "flex-1 min-w-[100px] py-2 text-[10px] font-bold rounded-lg transition uppercase tracking-wider whitespace-nowrap",
                      shopSubtab === sub.id
                        ? "bg-white/10 text-white"
                        : "text-gray-500",
                    )}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {shops
                  .filter((s) => (s.type || "standard") === shopSubtab)
                  .map((s) => (
                    <GlassCard key={s.id} className="!p-0 overflow-hidden">
                      <img
                        src={s.banner}
                        className="h-32 w-full object-cover"
                      />
                      <div className="-mt-10 ml-6 relative">
                        <img
                          src={s.logo}
                          className="w-20 h-20 rounded-full border-4 border-[#05050b] bg-black object-cover shadow-xl"
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="text-2xl font-bold mb-4">{s.name}</h3>

                        {shopSubtab === "donate" && (
                          <div className="mb-6 space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                Никнейм
                              </span>
                              <span className="text-sm font-bold">
                                {s.nickname}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                Машины
                              </span>
                              <span className="text-sm font-bold">
                                {s.carsCount}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                                Средства
                              </span>
                              <span className="text-sm font-bold text-emerald-400">
                                {s.credits}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="bg-black/30 rounded-xl p-5 border border-white/5 mb-6">
                          <span className="text-[10px] text-gray-600 block mb-3 font-bold uppercase tracking-widest">
                            Описание / Прайс
                          </span>
                          <pre className="text-gray-300 font-sans text-sm whitespace-pre-wrap">
                            {s.prices}
                          </pre>
                        </div>

                        <button
                          onClick={() =>
                            window.open("https://t.me/AntiSocialDetiz")
                          }
                          className="w-full bg-white text-black py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em]"
                        >
                          Купить
                        </button>
                      </div>
                    </GlassCard>
                  ))}
              </div>
            </motion.div>
          )}

          {activeTab === "builds" && (
            <motion.div
              key="builds"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Wrench size={20} className="text-purple-400" /> Билды
              </h2>
              <div className="flex bg-white/5 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setBuildSubtab("free")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition uppercase tracking-wider",
                    buildSubtab === "free"
                      ? "bg-white/10 text-white"
                      : "text-gray-500",
                  )}
                >
                  Бесплатные
                </button>
                <button
                  onClick={() => setBuildSubtab("paid")}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition uppercase tracking-wider",
                    buildSubtab === "paid"
                      ? "bg-white/10 text-white"
                      : "text-gray-500",
                  )}
                >
                  Платные
                </button>
              </div>

              <div className="space-y-6">
                {builds
                  .filter((b) => b.type === buildSubtab)
                  .map((b) => (
                    <GlassCard key={b.id} className="!p-0 overflow-hidden">
                      <img
                        src={b.carImage}
                        className="w-full h-48 object-cover"
                        alt="build"
                      />
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-[11px] font-bold text-gray-500 tracking-widest uppercase">
                            {b.nickname}
                          </span>
                          {b.type === "free" && (
                            <span className="text-[10px] text-blue-400/50 truncate max-w-[120px]">
                              {b.link}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (b.type === "free") {
                              try {
                                await navigator.clipboard.writeText(b.link);
                                alert("Ссылка на бид скопирована!");
                              } catch (e) {
                                alert(b.link);
                              }
                            } else {
                              window.open("https://t.me/AntiSocialDetiz");
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm"
                        >
                          {b.type === "free" ? (
                            <>
                              <Copy size={14} /> Скопировать билд
                            </>
                          ) : (
                            <>
                              <ExternalLink size={14} /> Купить билд
                            </>
                          )}
                        </button>
                      </div>
                    </GlassCard>
                  ))}
              </div>
            </motion.div>
          )}

          {activeTab === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {!isAdmin ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-10"
                >
                  <GlassCard className="p-10 flex flex-col items-center">
                    <Lock className="text-gray-600 mb-6" size={48} />
                    <h3 className="text-lg font-bold mb-10 text-center uppercase tracking-widest">
                      Master Access
                    </h3>
                    <input
                      type="password"
                      value={passInput}
                      onChange={(e) => setPassInput(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center outline-none focus:border-white/20 transition mb-6"
                    />
                    <button
                      onClick={handleAdminAuth}
                      className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest"
                    >
                      Unlock Panel
                    </button>
                  </GlassCard>
                </motion.div>
              ) : (
                <div className="space-y-12 pb-24">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-black uppercase tracking-widest">
                      Admin Control
                    </h2>
                    <button
                      onClick={() => setIsAdmin(false)}
                      className="bg-white/5 p-3 rounded-full text-gray-500"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>

                  {/* --- Tournament Tab --- */}
                  <GlassCard className="p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-blue-400">
                      {editItem ? "Редактировать" : "Новый"} Турнир
                    </h3>
                    <div className="space-y-4">
                      <input
                        value={tForm.name}
                        onChange={(e) =>
                          setTForm({ ...tForm, name: e.target.value })
                        }
                        placeholder="Название турнира"
                        className="admin-input"
                      />
                      <input
                        value={tForm.date}
                        onChange={(e) =>
                          setTForm({ ...tForm, date: e.target.value })
                        }
                        placeholder="Дата (25 Мая, 19:00)"
                        className="admin-input"
                      />
                      <input
                        value={tForm.prize}
                        onChange={(e) =>
                          setTForm({ ...tForm, prize: e.target.value })
                        }
                        placeholder="Призовой фонд"
                        className="admin-input"
                      />
                      <select
                        value={tForm.mode}
                        onChange={(e) =>
                          setTForm({ ...tForm, mode: e.target.value })
                        }
                        className="admin-input"
                      >
                        <option value="grip">Грип</option>
                        <option value="drift">Дрифт</option>
                        <option value="full">Фулл</option>
                      </select>
                      <ImageUpload
                        label="Баннер Турнира"
                        preview={tForm.banner}
                        onUpload={(v) => setTForm({ ...tForm, banner: v })}
                      />
                      <ImageUpload
                        label="Логотип Турнира"
                        preview={tForm.logo}
                        onUpload={(v) => setTForm({ ...tForm, logo: v })}
                      />
                      <input
                        value={tForm.orgs}
                        onChange={(e) =>
                          setTForm({ ...tForm, orgs: e.target.value })
                        }
                        placeholder="Организаторы (через запятую)"
                        className="admin-input"
                      />
                      <textarea
                        value={tForm.desc}
                        onChange={(e) =>
                          setTForm({ ...tForm, desc: e.target.value })
                        }
                        placeholder="Описание"
                        className="admin-input min-h-[100px]"
                      />
                      <button
                        onClick={() => {
                          addItem("tournaments", {
                            ...tForm,
                            orgs:
                              typeof tForm.orgs === "string"
                                ? tForm.orgs.split(",")
                                : tForm.orgs || [],
                          });
                          if (!editItem)
                            setTForm({
                              name: "",
                              date: "",
                              prize: "",
                              mode: "drift",
                              orgs: "",
                              desc: "",
                              banner: "",
                              logo: "",
                            });
                        }}
                        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase text-xs tracking-widest"
                      >
                        {editItem ? "Сохранить" : "Опубликовать"}
                      </button>
                      {editItem && (
                        <button
                          onClick={() => {
                            setEditItem(null);
                            setTForm({
                              name: "",
                              date: "",
                              prize: "",
                              mode: "drift",
                              orgs: "",
                              desc: "",
                              banner: "",
                              logo: "",
                            });
                          }}
                          className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest mt-2"
                        >
                          Отмена
                        </button>
                      )}
                    </div>
                  </GlassCard>

                  {/* --- Team Form --- */}
                  <GlassCard className="p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-emerald-400">
                      {editItem ? "Редактировать" : "Новая"} Команда
                    </h3>
                    <div className="space-y-4">
                      <input
                        value={teamForm.name}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, name: e.target.value })
                        }
                        placeholder="Название"
                        className="admin-input"
                      />
                      <input
                        value={teamForm.captain}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, captain: e.target.value })
                        }
                        placeholder="Капитан"
                        className="admin-input"
                      />
                      <ImageUpload
                        label="Баннер Команды"
                        preview={teamForm.banner}
                        onUpload={(v) =>
                          setTeamForm({ ...teamForm, banner: v })
                        }
                      />
                      <ImageUpload
                        label="Логотип Команды"
                        preview={teamForm.logo}
                        onUpload={(v) => setTeamForm({ ...teamForm, logo: v })}
                      />
                      <input
                        value={teamForm.age}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, age: e.target.value })
                        }
                        placeholder="Возраст (16+)"
                        className="admin-input"
                      />
                      <input
                        value={teamForm.link}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, link: e.target.value })
                        }
                        placeholder="Ссылка (t.me/...)"
                        className="admin-input"
                      />
                      <textarea
                        value={teamForm.desc}
                        onChange={(e) =>
                          setTeamForm({ ...teamForm, desc: e.target.value })
                        }
                        placeholder="Описание"
                        className="admin-input"
                      />
                      <button
                        onClick={() => {
                          addItem("teams", teamForm);
                          if (!editItem)
                            setTeamForm({
                              name: "",
                              captain: "",
                              banner: "",
                              logo: "",
                              age: "16+",
                              link: "",
                              desc: "",
                            });
                        }}
                        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase text-xs tracking-widest"
                      >
                        {editItem ? "Сохранить" : "Опубликовать"}
                      </button>
                      {editItem && (
                        <button
                          onClick={() => {
                            setEditItem(null);
                            setTeamForm({
                              name: "",
                              captain: "",
                              banner: "",
                              logo: "",
                              age: "16+",
                              link: "",
                              desc: "",
                            });
                          }}
                          className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest mt-2"
                        >
                          Отмена
                        </button>
                      )}
                    </div>
                  </GlassCard>

                  {/* --- Shop Form --- */}
                  <GlassCard className="p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-emerald-400">
                      {editItem ? "Редактировать" : "Новый"} Магазин
                    </h3>
                    <div className="space-y-4">
                      <select
                        value={shopForm.type}
                        onChange={(e) =>
                          setShopForm({
                            ...shopForm,
                            type: e.target.value as any,
                          })
                        }
                        className="admin-input"
                      >
                        <option value="standard">Обычный</option>
                        <option value="donate">Донат</option>
                        <option value="custom">Билд на заказ</option>
                        <option value="accounts">Аккаунт</option>
                      </select>
                      <input
                        value={shopForm.name}
                        onChange={(e) =>
                          setShopForm({ ...shopForm, name: e.target.value })
                        }
                        placeholder="Название магазина"
                        className="admin-input"
                      />
                      <ImageUpload
                        label="Баннер Магазина"
                        preview={shopForm.banner}
                        onUpload={(v) =>
                          setShopForm({ ...shopForm, banner: v })
                        }
                      />
                      <ImageUpload
                        label="Логотип Магазина"
                        preview={shopForm.logo}
                        onUpload={(v) => setShopForm({ ...shopForm, logo: v })}
                      />

                      {shopForm.type === "donate" && (
                        <>
                          <input
                            value={shopForm.nickname}
                            onChange={(e) =>
                              setShopForm({
                                ...shopForm,
                                nickname: e.target.value,
                              })
                            }
                            placeholder="Никнейм"
                            className="admin-input"
                          />
                          <input
                            value={shopForm.carsCount}
                            onChange={(e) =>
                              setShopForm({
                                ...shopForm,
                                carsCount: e.target.value,
                              })
                            }
                            placeholder="Кол-во машин"
                            className="admin-input"
                          />
                          <input
                            value={shopForm.credits}
                            onChange={(e) =>
                              setShopForm({
                                ...shopForm,
                                credits: e.target.value,
                              })
                            }
                            placeholder="Валюта (монеты/токены)"
                            className="admin-input"
                          />
                        </>
                      )}

                      <textarea
                        value={shopForm.prices}
                        onChange={(e) =>
                          setShopForm({ ...shopForm, prices: e.target.value })
                        }
                        placeholder="Описание / Прайс"
                        className="admin-input min-h-[120px]"
                      />
                      <button
                        onClick={() => {
                          addItem("shops", shopForm);
                          if (!editItem)
                            setShopForm({
                              name: "",
                              banner: "",
                              logo: "",
                              prices: "",
                              type: "standard",
                              nickname: "",
                              carsCount: "",
                              credits: "",
                            });
                        }}
                        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase text-xs tracking-widest"
                      >
                        {editItem ? "Сохранить" : "Опубликовать"}
                      </button>
                      {editItem && (
                        <button
                          onClick={() => {
                            setEditItem(null);
                            setShopForm({
                              name: "",
                              banner: "",
                              logo: "",
                              prices: "",
                              type: "standard",
                              nickname: "",
                              carsCount: "",
                              credits: "",
                            });
                          }}
                          className="w-full bg-white/5 border border-white/10 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest mt-2"
                        >
                          Отмена
                        </button>
                      )}
                    </div>
                  </GlassCard>

                  {/* --- Build Form --- */}
                  <GlassCard className="p-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-purple-400">
                      Новый Билд
                    </h3>
                    <div className="space-y-4">
                      <select
                        value={buildForm.type}
                        onChange={(e) =>
                          setBuildForm({
                            ...buildForm,
                            type: e.target.value as any,
                          })
                        }
                        className="admin-input"
                      >
                        <option value="free">Бесплатный</option>
                        <option value="paid">Платный</option>
                      </select>
                      <input
                        value={buildForm.nickname}
                        onChange={(e) =>
                          setBuildForm({
                            ...buildForm,
                            nickname: e.target.value,
                          })
                        }
                        placeholder="Никнейм автора"
                        className="admin-input"
                      />
                      <ImageUpload
                        label="Фото машины"
                        preview={buildForm.carImage}
                        onUpload={(v) =>
                          setBuildForm({ ...buildForm, carImage: v })
                        }
                      />
                      <input
                        value={buildForm.link}
                        onChange={(e) =>
                          setBuildForm({ ...buildForm, link: e.target.value })
                        }
                        placeholder="Ссылка (для бесплатных)"
                        className="admin-input"
                      />
                      <button
                        onClick={() => {
                          addItem("builds", buildForm);
                          setBuildForm({
                            type: "free",
                            nickname: "",
                            carImage: "",
                            link: "",
                          });
                        }}
                        className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase text-xs tracking-widest"
                      >
                        Добавить
                      </button>
                    </div>
                  </GlassCard>

                  {/* --- Manage List --- */}
                  <div className="pt-10">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6">
                      Управление Контентом
                    </h3>
                    <div className="divide-y divide-white/5">
                      {tournaments
                        .concat(teams as any)
                        .concat(shops as any)
                        .concat(builds as any)
                        .map((item: any) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center py-4"
                          >
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold opacity-30 whitespace-nowrap">
                                {item.type ||
                                  (item.prize
                                    ? "Tourney"
                                    : item.captain
                                      ? "Team"
                                      : item.prices
                                        ? "Shop"
                                        : "Build")}
                              </span>
                              <span className="text-sm font-medium tracking-tight truncate max-w-[200px]">
                                {item.name || item.nickname}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const col = item.prize
                                    ? "tournaments"
                                    : item.captain
                                      ? "teams"
                                      : item.prices
                                        ? "shops"
                                        : "builds";
                                  setEditItem({ col, id: item.id });
                                  if (col === "tournaments")
                                    setTForm({
                                      ...item,
                                      orgs: (item.orgs || []).join(","),
                                    });
                                  if (col === "teams") setTeamForm(item);
                                  if (col === "shops") setShopForm(item);
                                  if (col === "builds") setBuildForm(item);
                                  window.scrollTo({
                                    top: 0,
                                    behavior: "smooth",
                                  });
                                }}
                                className="p-3 text-white/30 hover:text-white transition"
                              >
                                <ImageIcon size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  setDeleteId({
                                    col: item.type
                                      ? "builds"
                                      : item.prize
                                        ? "tournaments"
                                        : item.captain
                                          ? "teams"
                                          : "shops",
                                    id: item.id,
                                  })
                                }
                                className="p-3 text-red-500/50 hover:text-red-500 transition"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Footer --- */}
        <footer className="mt-20 pt-10 border-t border-white/5 text-center text-[10px] text-gray-600 leading-relaxed uppercase tracking-[0.1em]">
          <a
            href="https://t.me/AntiSocialDetiz"
            target="_blank"
            className="block mb-4 text-white/50"
          >
            Хочешь добавить команду или турнир? <br />
            <b className="text-white">@AntiSocialDetiz</b>
          </a>
          <a
            href="https://t.me/notzhin"
            target="_blank"
            className="block opacity-50"
          >
            Need a dev or designer? <br />
            <b>@notzhin</b>
          </a>
        </footer>
      </main>

      {/* --- Navebar --- */}
      <nav className="fixed bottom-0 inset-x-0 h-24 bg-black/80 backdrop-blur-2xl border-t border-white/5 px-6 flex items-center justify-around z-50 pb-safe">
        {[
          {
            id: "tournaments",
            icon: Trophy,
            label: "Турниры",
            color: "text-blue-400",
          },
          {
            id: "teams",
            icon: Users,
            label: "Команды",
            color: "text-yellow-400",
          },
          {
            id: "shops",
            icon: ShoppingCart,
            label: "Шопы",
            color: "text-green-400",
          },
          {
            id: "builds",
            icon: Wrench,
            label: "Билды",
            color: "text-purple-400",
          },
          { id: "admin", icon: Lock, label: "Админ", color: "text-white" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all duration-300",
              activeTab === tab.id ? `${tab.color} scale-110` : "text-gray-500",
            )}
          >
            <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-widest">
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      {/* --- Global Styles --- */}
      <style>{`
        .admin-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 14px;
          color: white;
          font-size: 13px;
          outline: none;
          transition: border-color 0.3s;
        }
        .admin-input:focus { border-color: rgba(255,255,255,0.1); }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
}
