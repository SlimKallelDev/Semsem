import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_CURRENCY } from "../constants/currencies";

const STORAGE_KEY = "@semsem/preferences-v1";
const DEFAULT_LANGUAGE = "en";
const PreferencesContext = createContext({
  currency: DEFAULT_CURRENCY,
  language: DEFAULT_LANGUAGE,
  ready: false,
  setCurrency: async () => {},
  setLanguage: async () => {},
  t: (value) => value,
});

const TRANSLATIONS = {
  en: {},
  fr: {
    "Related pets": "Animaux associés", "View pet": "Voir l’animal", "This post was disabled because its linked pet was deleted. Tap to edit and select another pet.": "Cette publication a été désactivée car l’animal associé a été supprimé. Touchez pour la modifier et choisir un autre animal.", "This post was disabled because its linked pet was deleted. Select an active pet to publish it again.": "Cette publication a été désactivée car l’animal associé a été supprimé. Choisissez un animal actif pour la republier.",
    "New message received": "Nouveau message reçu", "New notification received": "Nouvelle notification reçue", "New messages and notifications": "Nouveaux messages et notifications", "Tap to view": "Touchez pour afficher", "Open": "Ouvrir",
    "Someone liked your post": "Quelqu’un a aimé votre publication", "Someone commented on your post": "Quelqu’un a commenté votre publication", "Someone replied to your comment": "Quelqu’un a répondu à votre commentaire", "Your likes, comments, post engagement, and appointment history": "Vos mentions J’aime, commentaires, interactions sur vos publications et historique de rendez-vous", "Posts you like, comments you write, engagement on your posts, and appointment changes you make will appear here.": "Les publications que vous aimez, vos commentaires, les interactions sur vos publications et vos changements de rendez-vous apparaîtront ici.", "Appointment updates and app alerts appear here. Post activity is in My Activity, and messages are in Messages.": "Les mises à jour de rendez-vous et alertes de l’application apparaissent ici. Retrouvez l’activité des publications dans Mon activité et les messages dans Messages.",
    "Account": "Compte", "Semsem user": "Utilisateur Semsem",
    "Sign in to your account or create one to connect with pet lovers.": "Connectez-vous ou créez un compte pour échanger avec des passionnés d’animaux.",
    "Choose the currency used to display sale prices.": "Choisissez la devise d’affichage des prix de vente.", "Choose the language used across Semsem.": "Choisissez la langue utilisée dans Semsem.",
    "currencies available": "devises disponibles", "Go back": "Retour", "View your profile": "Voir votre profil", "Are you sure you want to log out?": "Voulez-vous vraiment vous déconnecter ?", "Cancel": "Annuler", "Rates by ExchangeRate-API": "Taux fournis par ExchangeRate-API", "Open account and preferences": "Ouvrir le compte et les préférences",
    "Tunisian Dinar": "Dinar tunisien", "Euro": "Euro", "US Dollar": "Dollar américain", "British Pound": "Livre sterling", "Canadian Dollar": "Dollar canadien", "Australian Dollar": "Dollar australien", "Swiss Franc": "Franc suisse", "Japanese Yen": "Yen japonais", "Chinese Yuan": "Yuan chinois", "UAE Dirham": "Dirham des Émirats", "Saudi Riyal": "Riyal saoudien", "Moroccan Dirham": "Dirham marocain", "Algerian Dinar": "Dinar algérien", "Egyptian Pound": "Livre égyptienne", "Turkish Lira": "Livre turque", "Password (min. 6 characters)": "Mot de passe (6 caractères min.)", "Profile type *": "Type de profil *", "Location *": "Emplacement *", "Choose your country and city so Semsem can match nearby posts, pets, and services.": "Choisissez votre pays et votre ville pour voir les annonces, animaux et services à proximité.", "Select Location": "Choisir un emplacement", "Search city or country and choose one entry": "Recherchez une ville ou un pays et sélectionnez un résultat",
    "Home": "Accueil", "Feed": "Fil", "Meet": "Rencontres", "Services": "Services",
    "Notifications": "Notifications", "Messages": "Messages", "My Activity": "Mon activité", "My Space": "Mon espace",
    "Sign in": "Se connecter", "Sign up": "S’inscrire", "Log out": "Se déconnecter", "Profile": "Profil", "My profile": "Mon profil",
    "Edit Profile": "Modifier le profil", "Your account": "Votre compte", "Your preferences": "Vos préférences", "Default currency": "Devise par défaut",
    "Language": "Langue", "Choose display currency": "Choisissez la devise d’affichage", "Choose app language": "Choisissez la langue de l’application",
    "Converted prices are estimates based on daily exchange rates.": "Les prix convertis sont des estimations basées sur les taux de change quotidiens.",
    "View profile": "Voir le profil", "Welcome to Semsem": "Bienvenue sur Semsem", "Sign in to your account": "Connectez-vous à votre compte",
    "Create an account": "Créer un compte", "You are signed in as": "Vous êtes connecté en tant que", "Account settings": "Paramètres du compte",
    "All": "Tout", "QUESTION": "QUESTION", "ADOPTION": "ADOPTION", "LOST": "PERDU", "FOUND": "TROUVÉ", "MATING": "ACCOUPLEMENT", "SALE": "VENTE", "Question": "Question", "Adoption": "Adoption", "Lost": "Perdu", "Found": "Trouvé", "Mating": "Accouplement", "Sale": "Vente",
    "Cats": "Chats", "Dogs": "Chiens", "Birds": "Oiseaux", "Others": "Autres", "All Services": "Tous les services",
    "Email address": "Adresse e-mail", "Password": "Mot de passe", "Forgot password?": "Mot de passe oublié ?",
    "Welcome Back!": "Bon retour !", "Sign in to connect with pet lovers": "Connectez-vous pour rencontrer des passionnés d’animaux",
    "Don't have an account?": "Vous n’avez pas de compte ?", "Already have an account?": "Vous avez déjà un compte ?",
    "Join Our Pet Community": "Rejoignez notre communauté", "Sign up to meet new furry friends": "Inscrivez-vous pour rencontrer des amis à quatre pattes",
    "Your name / nickname": "Votre nom / surnom", "Create account and meet new furry friends": "Créez un compte et rencontrez de nouveaux amis à quatre pattes",
    "Country / City": "Pays / Ville", "Description": "Description", "Price": "Prix", "Currency": "Devise", "Send": "Envoyer", "Reply": "Répondre",
  },
  de: {
    "Related pets": "Zugehörige Tiere", "View pet": "Tier ansehen", "This post was disabled because its linked pet was deleted. Tap to edit and select another pet.": "Dieser Beitrag wurde deaktiviert, weil das verknüpfte Tier gelöscht wurde. Tippe zum Bearbeiten und wähle ein anderes Tier.", "This post was disabled because its linked pet was deleted. Select an active pet to publish it again.": "Dieser Beitrag wurde deaktiviert, weil das verknüpfte Tier gelöscht wurde. Wähle ein aktives Tier, um ihn wieder zu veröffentlichen.",
    "New message received": "Neue Nachricht erhalten", "New notification received": "Neue Benachrichtigung erhalten", "New messages and notifications": "Neue Nachrichten und Benachrichtigungen", "Tap to view": "Zum Anzeigen tippen", "Open": "Öffnen",
    "Someone liked your post": "Jemandem gefällt dein Beitrag", "Someone commented on your post": "Jemand hat deinen Beitrag kommentiert", "Someone replied to your comment": "Jemand hat auf deinen Kommentar geantwortet", "Your likes, comments, post engagement, and appointment history": "Deine Likes, Kommentare, Interaktionen mit deinen Beiträgen und Terminverlauf", "Posts you like, comments you write, engagement on your posts, and appointment changes you make will appear here.": "Hier erscheinen deine Likes und Kommentare, Interaktionen mit deinen Beiträgen und Terminänderungen.", "Appointment updates and app alerts appear here. Post activity is in My Activity, and messages are in Messages.": "Hier erscheinen Termin- und App-Hinweise. Beitragsaktivitäten findest du unter Meine Aktivitäten und Nachrichten unter Nachrichten.",
    "Account": "Konto", "Semsem user": "Semsem-Nutzer",
    "Sign in to your account or create one to connect with pet lovers.": "Melde dich an oder erstelle ein Konto, um dich mit Tierfreunden auszutauschen.",
    "Choose the currency used to display sale prices.": "Wähle die Währung für Verkaufspreise.", "Choose the language used across Semsem.": "Wähle die Sprache für Semsem.",
    "currencies available": "Währungen verfügbar", "Go back": "Zurück", "View your profile": "Profil ansehen", "Are you sure you want to log out?": "Möchtest du dich wirklich abmelden?", "Cancel": "Abbrechen", "Rates by ExchangeRate-API": "Wechselkurse von ExchangeRate-API", "Open account and preferences": "Konto und Einstellungen öffnen",
    "Tunisian Dinar": "Tunesischer Dinar", "Euro": "Euro", "US Dollar": "US-Dollar", "British Pound": "Britisches Pfund", "Canadian Dollar": "Kanadischer Dollar", "Australian Dollar": "Australischer Dollar", "Swiss Franc": "Schweizer Franken", "Japanese Yen": "Japanischer Yen", "Chinese Yuan": "Chinesischer Yuan", "UAE Dirham": "VAE-Dirham", "Saudi Riyal": "Saudi-Riyal", "Moroccan Dirham": "Marokkanischer Dirham", "Algerian Dinar": "Algerischer Dinar", "Egyptian Pound": "Ägyptisches Pfund", "Turkish Lira": "Türkische Lira", "Password (min. 6 characters)": "Passwort (mind. 6 Zeichen)", "Profile type *": "Profiltyp *", "Location *": "Standort *", "Choose your country and city so Semsem can match nearby posts, pets, and services.": "Wähle dein Land und deine Stadt, damit Semsem passende Beiträge, Tiere und Dienste in deiner Nähe findet.", "Select Location": "Standort auswählen", "Search city or country and choose one entry": "Suche nach einer Stadt oder einem Land und wähle einen Eintrag aus",
    "Home": "Startseite", "Feed": "Beiträge", "Meet": "Entdecken", "Services": "Dienste",
    "Notifications": "Benachrichtigungen", "Messages": "Nachrichten", "My Activity": "Meine Aktivitäten", "My Space": "Mein Bereich",
    "Sign in": "Anmelden", "Sign up": "Registrieren", "Log out": "Abmelden", "Profile": "Profil", "My profile": "Mein Profil",
    "Edit Profile": "Profil bearbeiten", "Your account": "Dein Konto", "Your preferences": "Deine Einstellungen", "Default currency": "Standardwährung",
    "Language": "Sprache", "Choose display currency": "Anzeigewährung auswählen", "Choose app language": "App-Sprache auswählen",
    "Converted prices are estimates based on daily exchange rates.": "Umgerechnete Preise sind Schätzungen auf Basis täglicher Wechselkurse.",
    "View profile": "Profil ansehen", "Welcome to Semsem": "Willkommen bei Semsem", "Sign in to your account": "Melde dich bei deinem Konto an",
    "Create an account": "Konto erstellen", "You are signed in as": "Angemeldet als", "Account settings": "Kontoeinstellungen",
    "All": "Alle", "QUESTION": "FRAGE", "ADOPTION": "ADOPTION", "LOST": "VERMISST", "FOUND": "GEFUNDEN", "MATING": "PARTNERSUCHE", "SALE": "VERKAUF", "Question": "Frage", "Adoption": "Adoption", "Lost": "Vermisst", "Found": "Gefunden", "Mating": "Partnersuche", "Sale": "Verkauf",
    "Cats": "Katzen", "Dogs": "Hunde", "Birds": "Vögel", "Others": "Andere", "All Services": "Alle Dienste",
    "Email address": "E-Mail-Adresse", "Password": "Passwort", "Forgot password?": "Passwort vergessen?",
    "Welcome Back!": "Willkommen zurück!", "Sign in to connect with pet lovers": "Melde dich an und lerne Tierfreunde kennen",
    "Don't have an account?": "Noch kein Konto?", "Already have an account?": "Du hast bereits ein Konto?",
    "Join Our Pet Community": "Werde Teil unserer Tier-Community", "Sign up to meet new furry friends": "Registriere dich und lerne neue Tierfreunde kennen",
    "Your name / nickname": "Dein Name / Spitzname", "Create account and meet new furry friends": "Erstelle ein Konto und lerne neue Tierfreunde kennen",
    "Country / City": "Land / Stadt", "Description": "Beschreibung", "Price": "Preis", "Currency": "Währung", "Send": "Senden", "Reply": "Antworten",
  },
  ar: {
    "Related pets": "الحيوانات المرتبطة", "View pet": "عرض الحيوان", "This post was disabled because its linked pet was deleted. Tap to edit and select another pet.": "تم تعطيل هذا المنشور لأن الحيوان المرتبط به حُذف. اضغط للتعديل واختيار حيوان آخر.", "This post was disabled because its linked pet was deleted. Select an active pet to publish it again.": "تم تعطيل هذا المنشور لأن الحيوان المرتبط به حُذف. اختر حيوانًا نشطًا لنشره مجددًا.",
    "New message received": "وصلتك رسالة جديدة", "New notification received": "وصلك إشعار جديد", "New messages and notifications": "وصلتك رسائل وإشعارات جديدة", "Tap to view": "اضغط للعرض", "Open": "فتح",
    "Someone liked your post": "أعجب شخص بمنشورك", "Someone commented on your post": "علّق شخص على منشورك", "Someone replied to your comment": "ردّ شخص على تعليقك", "Your likes, comments, post engagement, and appointment history": "إعجاباتك وتعليقاتك والتفاعل مع منشوراتك وسجل المواعيد", "Posts you like, comments you write, engagement on your posts, and appointment changes you make will appear here.": "ستظهر هنا المنشورات التي أعجبتك وتعليقاتك والتفاعلات على منشوراتك وتغييرات مواعيدك.", "Appointment updates and app alerts appear here. Post activity is in My Activity, and messages are in Messages.": "تظهر هنا تحديثات المواعيد وتنبيهات التطبيق. نشاط المنشورات في نشاطي والرسائل في قسم الرسائل.",
    "Account": "الحساب", "Semsem user": "مستخدم سمسم",
    "Sign in to your account or create one to connect with pet lovers.": "سجّل الدخول أو أنشئ حسابًا للتواصل مع محبي الحيوانات.",
    "Choose the currency used to display sale prices.": "اختر العملة المستخدمة لعرض أسعار البيع.", "Choose the language used across Semsem.": "اختر اللغة المستخدمة في سمسم.",
    "currencies available": "عملة متاحة", "Go back": "رجوع", "View your profile": "عرض ملفك الشخصي", "Are you sure you want to log out?": "هل تريد تسجيل الخروج؟", "Cancel": "إلغاء", "Rates by ExchangeRate-API": "أسعار الصرف من ExchangeRate-API", "Open account and preferences": "فتح الحساب والتفضيلات",
    "Tunisian Dinar": "الدينار التونسي", "Euro": "اليورو", "US Dollar": "الدولار الأمريكي", "British Pound": "الجنيه الإسترليني", "Canadian Dollar": "الدولار الكندي", "Australian Dollar": "الدولار الأسترالي", "Swiss Franc": "الفرنك السويسري", "Japanese Yen": "الين الياباني", "Chinese Yuan": "اليوان الصيني", "UAE Dirham": "درهم إماراتي", "Saudi Riyal": "الريال السعودي", "Moroccan Dirham": "الدرهم المغربي", "Algerian Dinar": "الدينار الجزائري", "Egyptian Pound": "الجنيه المصري", "Turkish Lira": "الليرة التركية", "Password (min. 6 characters)": "كلمة المرور (6 أحرف على الأقل)", "Profile type *": "نوع الملف الشخصي *", "Location *": "الموقع *", "Choose your country and city so Semsem can match nearby posts, pets, and services.": "اختر بلدك ومدينتك ليعرض سمسم المنشورات والحيوانات والخدمات القريبة.", "Select Location": "اختر الموقع", "Search city or country and choose one entry": "ابحث عن مدينة أو بلد واختر نتيجة واحدة",
    "Home": "الرئيسية", "Feed": "المنشورات", "Meet": "للتعارف", "Services": "الخدمات",
    "Notifications": "الإشعارات", "Messages": "الرسائل", "My Activity": "نشاطي", "My Space": "مساحتي",
    "Sign in": "تسجيل الدخول", "Sign up": "إنشاء حساب", "Log out": "تسجيل الخروج", "Profile": "الملف الشخصي", "My profile": "ملفي الشخصي",
    "Edit Profile": "تعديل الملف الشخصي", "Your account": "حسابك", "Your preferences": "تفضيلاتك", "Default currency": "العملة الافتراضية",
    "Language": "اللغة", "Choose display currency": "اختر عملة العرض", "Choose app language": "اختر لغة التطبيق",
    "Converted prices are estimates based on daily exchange rates.": "الأسعار المحوّلة تقديرية وتعتمد على أسعار الصرف اليومية.",
    "View profile": "عرض الملف الشخصي", "Welcome to Semsem": "مرحبًا بك في سمسم", "Sign in to your account": "سجّل الدخول إلى حسابك",
    "Create an account": "إنشاء حساب", "You are signed in as": "تم تسجيل الدخول باسم", "Account settings": "إعدادات الحساب",
    "All": "الكل", "QUESTION": "سؤال", "ADOPTION": "تبنّي", "LOST": "مفقود", "FOUND": "تم العثور عليه", "MATING": "تزاوج", "SALE": "للبيع", "Question": "سؤال", "Adoption": "تبنّي", "Lost": "مفقود", "Found": "تم العثور عليه", "Mating": "تزاوج", "Sale": "للبيع",
    "Cats": "قطط", "Dogs": "كلاب", "Birds": "طيور", "Others": "أخرى", "All Services": "كل الخدمات",
    "Email address": "البريد الإلكتروني", "Password": "كلمة المرور", "Forgot password?": "نسيت كلمة المرور؟",
    "Welcome Back!": "مرحبًا بعودتك!", "Sign in to connect with pet lovers": "سجّل الدخول للتواصل مع محبي الحيوانات",
    "Don't have an account?": "ليس لديك حساب؟", "Already have an account?": "لديك حساب بالفعل؟",
    "Join Our Pet Community": "انضم إلى مجتمعنا لمحبي الحيوانات", "Sign up to meet new furry friends": "أنشئ حسابًا لتتعرف على أصدقاء جدد",
    "Your name / nickname": "اسمك / لقبك", "Create account and meet new furry friends": "أنشئ حسابًا وتعرّف على أصدقاء جدد",
    "Country / City": "البلد / المدينة", "Description": "الوصف", "Price": "السعر", "Currency": "العملة", "Send": "إرسال", "Reply": "رد",
  },
};

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English", locale: "en-GB" },
  { value: "fr", label: "Français", locale: "fr-FR" },
  { value: "de", label: "Deutsch", locale: "de-DE" },
  { value: "ar", label: "العربية", locale: "ar" },
];

export const getLocaleForLanguage = (language) =>
  LANGUAGE_OPTIONS.find((item) => item.value === language)?.locale || "en-GB";
export const getLanguageLabel = (language) =>
  LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || "English";

export const PreferencesProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!active || !value) return;
        const stored = JSON.parse(value);
        if (typeof stored.currency === "string") setCurrencyState(stored.currency.toUpperCase());
        if (["en", "fr", "de", "ar"].includes(stored.language)) setLanguageState(stored.language);
      })
      .catch((error) => console.log("Load preferences error:", error?.message || error))
      .finally(() => { if (active) setReady(true); });

    return () => { active = false; };
  }, []);

  const setCurrency = useCallback((nextCurrency) => {
    const next = String(nextCurrency || DEFAULT_CURRENCY).toUpperCase();
    setCurrencyState(next);
  }, []);

  const setLanguage = useCallback((nextLanguage) => {
    const next = ["en", "fr", "de", "ar"].includes(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE;
    setLanguageState(next);
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ currency, language }))
      .catch((error) => console.log("Save preferences error:", error?.message || error));
  }, [currency, language, ready]);

  const t = useCallback((value) => {
    if (typeof value !== "string") return value;
    return TRANSLATIONS[language]?.[value] || value;
  }, [language]);

  const value = useMemo(() => ({
    currency,
    language,
    ready,
    setCurrency,
    setLanguage,
    t,
    languageOptions: LANGUAGE_OPTIONS,
  }), [currency, language, ready, setCurrency, setLanguage, t]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => useContext(PreferencesContext);
