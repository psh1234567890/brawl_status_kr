import type { Locale } from "./config";

export type AccountMessages = {
  navLogin: string;
  navAccount: string;
  accountTitle: string;
  accountDescription: string;
  disabledTitle: string;
  disabledBody: string;
  guestTitle: string;
  guestBody: string;
  googleSignIn: string;
  retry: string;
  serviceUnavailable: string;
  menuLabel: string;
  menuAccount: string;
  signOut: string;
  signingOut: string;
  signOutFailed: string;
  nickname: string;
  nicknamePlaceholder: string;
  playerTag: string;
  playerTagPlaceholder: string;
  playerTagHelp: string;
  saveProfile: string;
  saving: string;
  clearTag: string;
  profileSaved: string;
  profileConflict: string;
  personalBests: string;
  noPersonalBests: string;
  localImportTitle: string;
  localImportDescription: string;
  localImportCount: string;
  noLocalRecords: string;
  importRecords: string;
  importing: string;
  importQueued: string;
  importFailed: string;
  pendingCount: string;
  retrySync: string;
  onboardingTitle: string;
  acceptTerms: string;
  acknowledgePrivacy: string;
  confirmEligibility: string;
  completeOnboarding: string;
  policyUnavailable: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteConfirm: string;
  deleteButton: string;
  deleting: string;
  deleteFreshSession: string;
  deleteFailed: string;
  sync: {
    localOnly: string;
    checking: string;
    syncing: string;
    synced: string;
    offline: string;
    loginRequired: string;
    failed: string;
    pending: string;
    blocked: string;
  };
  gameNames: Record<"brawler-quiz" | "silhouette-quiz" | "map-quiz" | "ability-quiz", string>;
  errorGeneric: string;
  errorMessages: {
    INVALID_NICKNAME: string;
    INVALID_PLAYER_TAG: string;
    PROFILE_CHANGED: string;
    POLICY_NOT_CONFIGURED: string;
    FRESH_GOOGLE_SIGN_IN_REQUIRED: string;
    LOGIN_REQUIRED: string;
  };
};

export const accountMessages: Record<Locale, AccountMessages> = {
  ko: {
    navLogin: "로그인",
    navAccount: "계정",
    accountTitle: "계정",
    accountDescription: "닉네임, 대표 플레이어 태그, 미니게임 개인 최고 기록을 관리합니다.",
    disabledTitle: "계정 기능 준비 중",
    disabledBody: "현재 계정 기능은 사용할 수 없습니다. 비로그인 기능은 계속 이용할 수 있습니다.",
    guestTitle: "선택 사항인 계정",
    guestBody: "로그인하지 않아도 플레이어 검색, 미니게임, 즐겨찾기를 계속 사용할 수 있습니다.",
    googleSignIn: "Google로 계속",
    retry: "다시 시도",
    serviceUnavailable: "계정 상태를 확인할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.",
    menuLabel: "계정 메뉴",
    menuAccount: "계정 관리",
    signOut: "로그아웃",
    signingOut: "로그아웃 중…",
    signOutFailed: "로그아웃 요청이 완료되지 않았습니다. 다시 시도해 주세요.",
    nickname: "닉네임",
    nicknamePlaceholder: "1~32자",
    playerTag: "대표 플레이어 태그",
    playerTagPlaceholder: "예: 2PP",
    playerTagHelp: "편의를 위한 기본값이며, 플레이어 계정 소유권을 확인하거나 전투 기록을 수정·삭제할 권한을 주지 않습니다.",
    saveProfile: "프로필 저장",
    saving: "저장 중…",
    clearTag: "태그 지우기",
    profileSaved: "프로필을 저장했습니다.",
    profileConflict: "다른 탭에서 프로필이 변경되었습니다. 최신 값을 불러왔습니다.",
    personalBests: "미니게임 개인 최고 기록",
    noPersonalBests: "동기화된 개인 최고 기록이 없습니다.",
    localImportTitle: "이 브라우저의 기록 가져오기",
    localImportDescription: "가져오기를 선택한 뒤 유효한 기록만 계정에 병합합니다. 기존 브라우저 기록은 삭제하지 않습니다.",
    localImportCount: "가져올 기록 {count}개",
    noLocalRecords: "가져올 수 있는 기존 기록이 없습니다.",
    importRecords: "이 브라우저의 최고 기록 가져오기",
    importing: "가져오기 준비 중…",
    importQueued: "기록을 안전하게 보관했고 동기화를 대기 중입니다.",
    importFailed: "기록을 브라우저에 저장하지 못했습니다. 저장 공간을 확인한 뒤 다시 시도해 주세요.",
    pendingCount: "동기화 대기 {count}건",
    retrySync: "동기화 다시 시도",
    onboardingTitle: "계정 이용 안내",
    acceptTerms: "이용약관을 읽고 동의합니다.",
    acknowledgePrivacy: "개인정보 처리 안내를 읽고 확인했습니다.",
    confirmEligibility: "서비스에 표시된 계정 이용 자격 요건을 확인했으며 이에 해당합니다.",
    completeOnboarding: "확인하고 계속",
    policyUnavailable: "계정 이용 정책이 아직 설정되지 않았습니다. 로그인 상태는 유지되며 동기화와 프로필 변경은 준비 후 사용할 수 있습니다.",
    deleteTitle: "계정 삭제",
    deleteDescription: "계정 프로필, 로그인 연결, 세션, 클라우드 개인 최고 기록을 삭제합니다. 공개 전투 기록은 삭제되지 않습니다.",
    deleteConfirm: "내 계정과 계정 데이터를 삭제하는 데 동의합니다.",
    deleteButton: "계정 영구 삭제",
    deleting: "삭제 중…",
    deleteFreshSession: "삭제 전에 Google로 다시 로그인해 주세요.",
    deleteFailed: "계정을 삭제하지 못했습니다. 다시 로그인한 뒤 다시 시도해 주세요.",
    sync: { localOnly: "이 브라우저에만 저장됨", checking: "확인 중", syncing: "동기화 중", synced: "동기화됨", offline: "오프라인 · 전송 대기", loginRequired: "같은 계정으로 다시 로그인 필요", failed: "동기화 실패", pending: "전송 대기 중", blocked: "확인 후 재시도 필요" },
    gameNames: { "brawler-quiz": "브롤러 퀴즈", "silhouette-quiz": "실루엣 퀴즈", "map-quiz": "맵 퀴즈", "ability-quiz": "능력 퀴즈" },
    errorGeneric: "요청을 완료하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.",
    errorMessages: { INVALID_NICKNAME: "닉네임은 1~32자이며 제어 문자를 포함할 수 없습니다.", INVALID_PLAYER_TAG: "플레이어 태그 형식을 확인해 주세요.", PROFILE_CHANGED: "다른 탭에서 프로필이 변경되었습니다. 최신 값을 불러왔습니다.", POLICY_NOT_CONFIGURED: "계정 이용 정책이 아직 설정되지 않았습니다.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "삭제 전에 Google로 다시 로그인해 주세요.", LOGIN_REQUIRED: "계정 보호를 위해 다시 로그인해 주세요." },
  },
  en: {
    navLogin: "Sign in", navAccount: "Account", accountTitle: "Account", accountDescription: "Manage your nickname, default player tag, and Mini Game personal bests.", disabledTitle: "Accounts are not available yet", disabledBody: "Account features are currently unavailable. Guest features remain available.", guestTitle: "An optional account", guestBody: "Player search, Mini Games, and favorites remain available without signing in.", googleSignIn: "Continue with Google", retry: "Try again", serviceUnavailable: "We could not check your account. Check your connection and try again.", menuLabel: "Account menu", menuAccount: "Manage account", signOut: "Sign out", signingOut: "Signing out…", signOutFailed: "Sign-out did not complete. Please try again.", nickname: "Nickname", nicknamePlaceholder: "1–32 characters", playerTag: "Default player tag", playerTagPlaceholder: "Example: 2PP", playerTagHelp: "This is a convenience default. It does not verify ownership or grant permission to change or delete battle records.", saveProfile: "Save profile", saving: "Saving…", clearTag: "Clear tag", profileSaved: "Profile saved.", profileConflict: "Your profile changed in another tab. The latest values were loaded.", personalBests: "Mini Game personal bests", noPersonalBests: "No synced personal bests yet.", localImportTitle: "Import records from this browser", localImportDescription: "Choose import to merge valid records into your account. Your existing browser records will remain unchanged.", localImportCount: "{count} records available to import", noLocalRecords: "There are no valid existing records to import.", importRecords: "Import this browser’s personal bests", importing: "Preparing import…", importQueued: "Records are safely queued for sync.", importFailed: "Records could not be saved in this browser. Check available storage and try again.", pendingCount: "{count} sync operations pending", retrySync: "Retry sync", onboardingTitle: "Account notices", acceptTerms: "I have read and agree to the Terms.", acknowledgePrivacy: "I have read the Privacy Notice.", confirmEligibility: "I have read the account eligibility requirements shown by the service and meet them.", completeOnboarding: "Confirm and continue", policyUnavailable: "Account policies are not configured yet. You can remain signed in; profile changes and sync will be available when setup is complete.", deleteTitle: "Delete account", deleteDescription: "This deletes your profile, Google connection, sessions, and cloud personal bests. Public battle records are not deleted.", deleteConfirm: "I understand and want to delete my account data.", deleteButton: "Permanently delete account", deleting: "Deleting…", deleteFreshSession: "Sign in with Google again before deleting your account.", deleteFailed: "We could not delete your account. Sign in again and retry.",
    sync: { localOnly: "Saved in this browser only", checking: "Checking", syncing: "Syncing", synced: "Synced", offline: "Offline · queued", loginRequired: "Sign in to the same account to continue", failed: "Sync failed", pending: "Waiting to send", blocked: "Review and retry required" },
    gameNames: { "brawler-quiz": "Brawler Quiz", "silhouette-quiz": "Silhouette Quiz", "map-quiz": "Map Quiz", "ability-quiz": "Ability Quiz" },
    errorGeneric: "The request could not be completed. Check your connection and try again.",
    errorMessages: { INVALID_NICKNAME: "Use 1–32 characters without control characters.", INVALID_PLAYER_TAG: "Check the player tag format.", PROFILE_CHANGED: "Your profile changed in another tab. The latest values were loaded.", POLICY_NOT_CONFIGURED: "Account policies are not configured yet.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Sign in with Google again before deleting your account.", LOGIN_REQUIRED: "Sign in again to protect your account." },
  },
  ja: {
    navLogin: "ログイン", navAccount: "アカウント", accountTitle: "アカウント", accountDescription: "ニックネーム、既定のプレイヤータグ、ミニゲームの自己ベストを管理します。", disabledTitle: "アカウント機能は準備中です", disabledBody: "現在アカウント機能は利用できません。ゲスト機能は引き続き利用できます。", guestTitle: "任意のアカウント", guestBody: "ログインしなくてもプレイヤー検索、ミニゲーム、お気に入りを利用できます。", googleSignIn: "Googleで続行", retry: "再試行", serviceUnavailable: "アカウントを確認できません。接続を確認して再試行してください。", menuLabel: "アカウントメニュー", menuAccount: "アカウント管理", signOut: "ログアウト", signingOut: "ログアウト中…", signOutFailed: "ログアウトできませんでした。再試行してください。", nickname: "ニックネーム", nicknamePlaceholder: "1～32文字", playerTag: "既定のプレイヤータグ", playerTagPlaceholder: "例: 2PP", playerTagHelp: "利便性のための既定値です。所有権を確認したり、戦績の変更・削除を許可したりするものではありません。", saveProfile: "プロフィールを保存", saving: "保存中…", clearTag: "タグを消去", profileSaved: "プロフィールを保存しました。", profileConflict: "別のタブでプロフィールが変更されました。最新の内容を読み込みました。", personalBests: "ミニゲームの自己ベスト", noPersonalBests: "同期済みの自己ベストはありません。", localImportTitle: "このブラウザーの記録を取り込む", localImportDescription: "取り込みを選ぶと、有効な記録だけをアカウントに統合します。既存のブラウザー記録は削除しません。", localImportCount: "取り込み可能な記録: {count}件", noLocalRecords: "取り込める有効な記録はありません。", importRecords: "このブラウザーの自己ベストを取り込む", importing: "取り込みを準備中…", importQueued: "記録を安全に保存し、同期を待っています。", importFailed: "ブラウザーに保存できませんでした。空き容量を確認して再試行してください。", pendingCount: "同期待ち: {count}件", retrySync: "同期を再試行", onboardingTitle: "アカウント利用案内", acceptTerms: "利用規約を読み、同意します。", acknowledgePrivacy: "プライバシー通知を読みました。", confirmEligibility: "サービスに表示されたアカウント利用資格を読み、条件を満たしています。", completeOnboarding: "確認して続行", policyUnavailable: "アカウントポリシーが未設定です。ログイン状態は維持できますが、設定完了までプロフィール変更と同期は利用できません。", deleteTitle: "アカウント削除", deleteDescription: "プロフィール、Google連携、セッション、クラウド自己ベストを削除します。公開戦績は削除されません。", deleteConfirm: "アカウントデータの削除を希望します。", deleteButton: "アカウントを完全に削除", deleting: "削除中…", deleteFreshSession: "削除する前にGoogleへ再ログインしてください。", deleteFailed: "削除できませんでした。再ログインして再試行してください。",
    sync: { localOnly: "このブラウザーのみ", checking: "確認中", syncing: "同期中", synced: "同期済み", offline: "オフライン・送信待ち", loginRequired: "同じアカウントに再ログインしてください", failed: "同期失敗", pending: "送信待ち", blocked: "確認して再試行してください" },
    gameNames: { "brawler-quiz": "ブロウラークイズ", "silhouette-quiz": "シルエットクイズ", "map-quiz": "マップクイズ", "ability-quiz": "能力クイズ" },
    errorGeneric: "処理できませんでした。接続を確認して再試行してください。",
    errorMessages: { INVALID_NICKNAME: "制御文字を含まない1～32文字を入力してください。", INVALID_PLAYER_TAG: "プレイヤータグの形式を確認してください。", PROFILE_CHANGED: "別のタブで変更されました。最新の内容を読み込みました。", POLICY_NOT_CONFIGURED: "アカウントポリシーが未設定です。", FRESH_GOOGLE_SIGN_IN_REQUIRED: "削除する前にGoogleへ再ログインしてください。", LOGIN_REQUIRED: "アカウント保護のため再ログインしてください。" },
  },
  "pt-br": {
    navLogin: "Entrar", navAccount: "Conta", accountTitle: "Conta", accountDescription: "Gerencie seu apelido, tag padrão e recordes pessoais dos minijogos.", disabledTitle: "Contas ainda indisponíveis", disabledBody: "Os recursos de conta estão indisponíveis no momento. Os recursos para visitantes continuam disponíveis.", guestTitle: "Uma conta opcional", guestBody: "Pesquisa de jogadores, minijogos e favoritos continuam disponíveis sem entrar.", googleSignIn: "Continuar com Google", retry: "Tentar novamente", serviceUnavailable: "Não foi possível verificar sua conta. Confira a conexão e tente novamente.", menuLabel: "Menu da conta", menuAccount: "Gerenciar conta", signOut: "Sair", signingOut: "Saindo…", signOutFailed: "Não foi possível concluir a saída. Tente novamente.", nickname: "Apelido", nicknamePlaceholder: "1–32 caracteres", playerTag: "Tag padrão do jogador", playerTagPlaceholder: "Exemplo: 2PP", playerTagHelp: "É apenas uma tag padrão por conveniência. Não verifica propriedade nem autoriza alterar ou excluir batalhas.", saveProfile: "Salvar perfil", saving: "Salvando…", clearTag: "Limpar tag", profileSaved: "Perfil salvo.", profileConflict: "Seu perfil mudou em outra aba. Os dados mais recentes foram carregados.", personalBests: "Recordes pessoais dos minijogos", noPersonalBests: "Nenhum recorde sincronizado ainda.", localImportTitle: "Importar registros deste navegador", localImportDescription: "Escolha importar para unir apenas registros válidos à sua conta. Os registros locais não serão apagados.", localImportCount: "{count} registros disponíveis", noLocalRecords: "Não há registros válidos para importar.", importRecords: "Importar recordes deste navegador", importing: "Preparando importação…", importQueued: "Registros salvos com segurança e aguardando sincronização.", importFailed: "Não foi possível salvar neste navegador. Verifique o espaço disponível e tente novamente.", pendingCount: "{count} operações aguardando sincronização", retrySync: "Tentar sincronizar novamente", onboardingTitle: "Avisos da conta", acceptTerms: "Li e aceito os Termos.", acknowledgePrivacy: "Li o Aviso de Privacidade.", confirmEligibility: "Li os requisitos de elegibilidade exibidos pelo serviço e os cumpro.", completeOnboarding: "Confirmar e continuar", policyUnavailable: "As políticas da conta ainda não estão configuradas. Você pode continuar conectado; edição e sincronização estarão disponíveis após a configuração.", deleteTitle: "Excluir conta", deleteDescription: "Isso exclui o perfil, vínculo do Google, sessões e recordes na nuvem. Registros públicos de batalha não são excluídos.", deleteConfirm: "Entendo e quero excluir os dados da minha conta.", deleteButton: "Excluir conta permanentemente", deleting: "Excluindo…", deleteFreshSession: "Entre novamente com o Google antes de excluir.", deleteFailed: "Não foi possível excluir. Entre novamente e tente outra vez.",
    sync: { localOnly: "Salvo apenas neste navegador", checking: "Verificando", syncing: "Sincronizando", synced: "Sincronizado", offline: "Offline · aguardando envio", loginRequired: "Entre novamente na mesma conta", failed: "Falha na sincronização", pending: "Aguardando envio", blocked: "Revise e tente novamente" },
    gameNames: { "brawler-quiz": "Quiz de Brawlers", "silhouette-quiz": "Quiz de Silhuetas", "map-quiz": "Quiz de Mapas", "ability-quiz": "Quiz de Habilidades" },
    errorGeneric: "Não foi possível concluir. Confira a conexão e tente novamente.",
    errorMessages: { INVALID_NICKNAME: "Use de 1 a 32 caracteres sem caracteres de controle.", INVALID_PLAYER_TAG: "Confira o formato da tag do jogador.", PROFILE_CHANGED: "O perfil mudou em outra aba. Os dados atuais foram carregados.", POLICY_NOT_CONFIGURED: "As políticas da conta ainda não estão configuradas.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Entre novamente com o Google antes de excluir.", LOGIN_REQUIRED: "Entre novamente para proteger sua conta." },
  },
  es: {
    navLogin: "Iniciar sesión", navAccount: "Cuenta", accountTitle: "Cuenta", accountDescription: "Administra tu apodo, etiqueta predeterminada y récords personales de los minijuegos.", disabledTitle: "Las cuentas aún no están disponibles", disabledBody: "Las funciones de cuenta no están disponibles por ahora. Puedes seguir usando las funciones de invitado.", guestTitle: "Una cuenta opcional", guestBody: "La búsqueda de jugadores, los minijuegos y los favoritos siguen disponibles sin iniciar sesión.", googleSignIn: "Continuar con Google", retry: "Reintentar", serviceUnavailable: "No se pudo comprobar tu cuenta. Comprueba la conexión e inténtalo de nuevo.", menuLabel: "Menú de cuenta", menuAccount: "Administrar cuenta", signOut: "Cerrar sesión", signingOut: "Cerrando sesión…", signOutFailed: "No se pudo cerrar la sesión. Inténtalo de nuevo.", nickname: "Apodo", nicknamePlaceholder: "1–32 caracteres", playerTag: "Etiqueta predeterminada", playerTagPlaceholder: "Ejemplo: 2PP", playerTagHelp: "Es una etiqueta predeterminada por comodidad. No verifica la propiedad ni permite cambiar o borrar batallas.", saveProfile: "Guardar perfil", saving: "Guardando…", clearTag: "Borrar etiqueta", profileSaved: "Perfil guardado.", profileConflict: "El perfil cambió en otra pestaña. Se cargaron los datos más recientes.", personalBests: "Récords personales de minijuegos", noPersonalBests: "Todavía no hay récords sincronizados.", localImportTitle: "Importar registros de este navegador", localImportDescription: "Al importar, solo se combinan los registros válidos. Los registros existentes del navegador no se borran.", localImportCount: "{count} registros disponibles", noLocalRecords: "No hay registros válidos para importar.", importRecords: "Importar récords de este navegador", importing: "Preparando importación…", importQueued: "Los registros se guardaron y esperan sincronizarse.", importFailed: "No se pudieron guardar en este navegador. Comprueba el espacio disponible e inténtalo de nuevo.", pendingCount: "{count} operaciones pendientes", retrySync: "Reintentar sincronización", onboardingTitle: "Avisos de la cuenta", acceptTerms: "He leído y acepto los Términos.", acknowledgePrivacy: "He leído el Aviso de privacidad.", confirmEligibility: "He leído los requisitos de elegibilidad de la cuenta y los cumplo.", completeOnboarding: "Confirmar y continuar", policyUnavailable: "Las políticas de la cuenta aún no están configuradas. Puedes mantener la sesión; la edición y sincronización estarán disponibles cuando se complete la configuración.", deleteTitle: "Eliminar cuenta", deleteDescription: "Se eliminarán el perfil, el vínculo de Google, las sesiones y los récords en la nube. Los registros públicos de batalla no se eliminan.", deleteConfirm: "Entiendo y quiero eliminar los datos de mi cuenta.", deleteButton: "Eliminar cuenta permanentemente", deleting: "Eliminando…", deleteFreshSession: "Vuelve a iniciar sesión con Google antes de eliminar la cuenta.", deleteFailed: "No se pudo eliminar la cuenta. Inicia sesión de nuevo e inténtalo otra vez.",
    sync: { localOnly: "Guardado solo en este navegador", checking: "Comprobando", syncing: "Sincronizando", synced: "Sincronizado", offline: "Sin conexión · en espera", loginRequired: "Inicia sesión en la misma cuenta", failed: "Error de sincronización", pending: "Pendiente de envío", blocked: "Revisa e inténtalo de nuevo" },
    gameNames: { "brawler-quiz": "Quiz de Brawlers", "silhouette-quiz": "Quiz de siluetas", "map-quiz": "Quiz de mapas", "ability-quiz": "Quiz de habilidades" },
    errorGeneric: "No se pudo completar la solicitud. Comprueba la conexión e inténtalo de nuevo.",
    errorMessages: { INVALID_NICKNAME: "Usa entre 1 y 32 caracteres, sin caracteres de control.", INVALID_PLAYER_TAG: "Comprueba el formato de la etiqueta.", PROFILE_CHANGED: "El perfil cambió en otra pestaña. Se cargaron los datos actuales.", POLICY_NOT_CONFIGURED: "Las políticas de la cuenta aún no están configuradas.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Vuelve a iniciar sesión con Google antes de eliminar.", LOGIN_REQUIRED: "Inicia sesión de nuevo para proteger tu cuenta." },
  },
  tr: {
    navLogin: "Giriş yap", navAccount: "Hesap", accountTitle: "Hesap", accountDescription: "Takma adını, varsayılan oyuncu etiketini ve Mini Oyun rekorlarını yönet.", disabledTitle: "Hesaplar henüz kullanılamıyor", disabledBody: "Hesap özellikleri şu anda kullanılamıyor. Misafir özelliklerini kullanmaya devam edebilirsin.", guestTitle: "İsteğe bağlı hesap", guestBody: "Oyuncu arama, Mini Oyunlar ve favoriler oturum açmadan kullanılabilir.", googleSignIn: "Google ile devam et", retry: "Yeniden dene", serviceUnavailable: "Hesabın kontrol edilemedi. Bağlantını kontrol edip yeniden dene.", menuLabel: "Hesap menüsü", menuAccount: "Hesabı yönet", signOut: "Çıkış yap", signingOut: "Çıkış yapılıyor…", signOutFailed: "Çıkış tamamlanmadı. Yeniden dene.", nickname: "Takma ad", nicknamePlaceholder: "1–32 karakter", playerTag: "Varsayılan oyuncu etiketi", playerTagPlaceholder: "Örnek: 2PP", playerTagHelp: "Kolaylık için varsayılan etikettir. Sahipliği doğrulamaz veya savaş kayıtlarını değiştirme/silme yetkisi vermez.", saveProfile: "Profili kaydet", saving: "Kaydediliyor…", clearTag: "Etiketi temizle", profileSaved: "Profil kaydedildi.", profileConflict: "Profil başka bir sekmede değişti. En güncel değerler yüklendi.", personalBests: "Mini Oyun kişisel rekorları", noPersonalBests: "Henüz eşitlenmiş rekor yok.", localImportTitle: "Bu tarayıcıdaki kayıtları içe aktar", localImportDescription: "İçe aktarmayı seçtiğinde yalnızca geçerli kayıtlar hesaba eklenir. Eski tarayıcı kayıtları silinmez.", localImportCount: "İçe aktarılabilir kayıt: {count}", noLocalRecords: "İçe aktarılabilecek geçerli kayıt yok.", importRecords: "Bu tarayıcının rekorlarını içe aktar", importing: "İçe aktarma hazırlanıyor…", importQueued: "Kayıtlar güvenle kuyruğa alındı.", importFailed: "Tarayıcıya kaydedilemedi. Boş alanı kontrol edip yeniden dene.", pendingCount: "Eşitleme bekleyen işlem: {count}", retrySync: "Eşitlemeyi yeniden dene", onboardingTitle: "Hesap bilgilendirmeleri", acceptTerms: "Koşulları okudum ve kabul ediyorum.", acknowledgePrivacy: "Gizlilik bildirimini okudum.", confirmEligibility: "Hizmette gösterilen hesap uygunluk koşullarını okudum ve karşılıyorum.", completeOnboarding: "Onayla ve devam et", policyUnavailable: "Hesap politikaları henüz ayarlanmadı. Oturum açık kalabilir; kurulum tamamlanana kadar profil ve eşitleme kullanılamaz.", deleteTitle: "Hesabı sil", deleteDescription: "Profil, Google bağlantısı, oturumlar ve bulut rekorları silinir. Herkese açık savaş kayıtları silinmez.", deleteConfirm: "Hesap verilerimin silinmesini istiyorum.", deleteButton: "Hesabı kalıcı olarak sil", deleting: "Siliniyor…", deleteFreshSession: "Silmeden önce Google ile yeniden giriş yap.", deleteFailed: "Hesap silinemedi. Yeniden giriş yapıp tekrar dene.",
    sync: { localOnly: "Yalnızca bu tarayıcıya kaydedildi", checking: "Kontrol ediliyor", syncing: "Eşitleniyor", synced: "Eşitlendi", offline: "Çevrimdışı · sırada", loginRequired: "Aynı hesapla yeniden giriş yap", failed: "Eşitleme başarısız", pending: "Gönderim bekleniyor", blocked: "Kontrol edip yeniden dene" },
    gameNames: { "brawler-quiz": "Brawler Testi", "silhouette-quiz": "Silüet Testi", "map-quiz": "Harita Testi", "ability-quiz": "Yetenek Testi" },
    errorGeneric: "İstek tamamlanamadı. Bağlantını kontrol edip yeniden dene.",
    errorMessages: { INVALID_NICKNAME: "Denetim karakteri içermeyen 1–32 karakter kullan.", INVALID_PLAYER_TAG: "Oyuncu etiketi biçimini kontrol et.", PROFILE_CHANGED: "Profil başka bir sekmede değişti. Güncel değerler yüklendi.", POLICY_NOT_CONFIGURED: "Hesap politikaları henüz ayarlanmadı.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Silmeden önce Google ile yeniden giriş yap.", LOGIN_REQUIRED: "Hesabını korumak için yeniden giriş yap." },
  },
  de: {
    navLogin: "Anmelden", navAccount: "Konto", accountTitle: "Konto", accountDescription: "Verwalte deinen Spitznamen, Standard-Spielertag und persönliche Mini-Game-Bestwerte.", disabledTitle: "Konten sind noch nicht verfügbar", disabledBody: "Kontofunktionen sind derzeit nicht verfügbar. Gastfunktionen bleiben nutzbar.", guestTitle: "Ein optionales Konto", guestBody: "Spielersuche, Mini Games und Favoriten sind auch ohne Anmeldung verfügbar.", googleSignIn: "Mit Google fortfahren", retry: "Erneut versuchen", serviceUnavailable: "Dein Konto konnte nicht geprüft werden. Prüfe die Verbindung und versuche es erneut.", menuLabel: "Kontomenü", menuAccount: "Konto verwalten", signOut: "Abmelden", signingOut: "Abmeldung läuft…", signOutFailed: "Die Abmeldung wurde nicht abgeschlossen. Bitte erneut versuchen.", nickname: "Spitzname", nicknamePlaceholder: "1–32 Zeichen", playerTag: "Standard-Spielertag", playerTagPlaceholder: "Beispiel: 2PP", playerTagHelp: "Dies ist ein Standardwert zur Vereinfachung. Er bestätigt kein Eigentum und erlaubt nicht, Kampfaufzeichnungen zu ändern oder zu löschen.", saveProfile: "Profil speichern", saving: "Speichern…", clearTag: "Tag löschen", profileSaved: "Profil gespeichert.", profileConflict: "Dein Profil wurde in einem anderen Tab geändert. Die aktuellen Werte wurden geladen.", personalBests: "Persönliche Mini-Game-Bestwerte", noPersonalBests: "Noch keine synchronisierten Bestwerte.", localImportTitle: "Aufzeichnungen aus diesem Browser importieren", localImportDescription: "Beim Import werden nur gültige Aufzeichnungen mit deinem Konto zusammengeführt. Lokale Aufzeichnungen bleiben erhalten.", localImportCount: "{count} Aufzeichnungen verfügbar", noLocalRecords: "Keine gültigen Aufzeichnungen zum Importieren.", importRecords: "Bestwerte dieses Browsers importieren", importing: "Import wird vorbereitet…", importQueued: "Aufzeichnungen sind sicher gespeichert und warten auf Synchronisierung.", importFailed: "Speichern in diesem Browser nicht möglich. Prüfe den Speicherplatz und versuche es erneut.", pendingCount: "{count} Synchronisierungsvorgänge ausstehend", retrySync: "Synchronisierung erneut versuchen", onboardingTitle: "Kontohinweise", acceptTerms: "Ich habe die Nutzungsbedingungen gelesen und stimme zu.", acknowledgePrivacy: "Ich habe den Datenschutzhinweis gelesen.", confirmEligibility: "Ich habe die angezeigten Kontobedingungen gelesen und erfülle sie.", completeOnboarding: "Bestätigen und fortfahren", policyUnavailable: "Kontorichtlinien sind noch nicht eingerichtet. Du bleibst angemeldet; Profiländerungen und Synchronisierung sind nach der Einrichtung verfügbar.", deleteTitle: "Konto löschen", deleteDescription: "Profil, Google-Verknüpfung, Sitzungen und Cloud-Bestwerte werden gelöscht. Öffentliche Kampfaufzeichnungen bleiben bestehen.", deleteConfirm: "Ich möchte meine Kontodaten löschen.", deleteButton: "Konto endgültig löschen", deleting: "Wird gelöscht…", deleteFreshSession: "Melde dich vor dem Löschen erneut mit Google an.", deleteFailed: "Das Konto konnte nicht gelöscht werden. Melde dich erneut an und versuche es noch einmal.",
    sync: { localOnly: "Nur in diesem Browser gespeichert", checking: "Wird geprüft", syncing: "Wird synchronisiert", synced: "Synchronisiert", offline: "Offline · wartet auf Übertragung", loginRequired: "Melde dich mit demselben Konto erneut an", failed: "Synchronisierung fehlgeschlagen", pending: "Übertragung ausstehend", blocked: "Prüfen und erneut versuchen" },
    gameNames: { "brawler-quiz": "Brawler-Quiz", "silhouette-quiz": "Silhouetten-Quiz", "map-quiz": "Karten-Quiz", "ability-quiz": "Fähigkeiten-Quiz" },
    errorGeneric: "Die Anfrage konnte nicht abgeschlossen werden. Prüfe die Verbindung und versuche es erneut.",
    errorMessages: { INVALID_NICKNAME: "Verwende 1–32 Zeichen ohne Steuerzeichen.", INVALID_PLAYER_TAG: "Prüfe das Format des Spielertags.", PROFILE_CHANGED: "Das Profil wurde in einem anderen Tab geändert. Aktuelle Werte geladen.", POLICY_NOT_CONFIGURED: "Kontorichtlinien sind noch nicht eingerichtet.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Melde dich vor dem Löschen erneut mit Google an.", LOGIN_REQUIRED: "Melde dich zum Schutz deines Kontos erneut an." },
  },
  fr: {
    navLogin: "Se connecter", navAccount: "Compte", accountTitle: "Compte", accountDescription: "Gérez votre pseudo, tag de joueur par défaut et records personnels des mini-jeux.", disabledTitle: "Les comptes ne sont pas encore disponibles", disabledBody: "Les fonctions de compte sont indisponibles pour le moment. Le mode invité reste accessible.", guestTitle: "Un compte facultatif", guestBody: "La recherche de joueurs, les mini-jeux et les favoris restent accessibles sans connexion.", googleSignIn: "Continuer avec Google", retry: "Réessayer", serviceUnavailable: "Impossible de vérifier votre compte. Vérifiez la connexion puis réessayez.", menuLabel: "Menu du compte", menuAccount: "Gérer le compte", signOut: "Se déconnecter", signingOut: "Déconnexion…", signOutFailed: "La déconnexion n’a pas abouti. Réessayez.", nickname: "Pseudo", nicknamePlaceholder: "1 à 32 caractères", playerTag: "Tag de joueur par défaut", playerTagPlaceholder: "Exemple : 2PP", playerTagHelp: "Cette valeur par défaut facilite l’usage. Elle ne vérifie pas la propriété et n’autorise pas la modification ou la suppression des combats.", saveProfile: "Enregistrer le profil", saving: "Enregistrement…", clearTag: "Effacer le tag", profileSaved: "Profil enregistré.", profileConflict: "Votre profil a changé dans un autre onglet. Les dernières valeurs ont été chargées.", personalBests: "Records personnels des mini-jeux", noPersonalBests: "Aucun record synchronisé pour le moment.", localImportTitle: "Importer les résultats de ce navigateur", localImportDescription: "En choisissant l’import, seuls les résultats valides seront fusionnés au compte. Les données locales restent intactes.", localImportCount: "{count} résultats à importer", noLocalRecords: "Aucun résultat valide à importer.", importRecords: "Importer les records de ce navigateur", importing: "Préparation de l’import…", importQueued: "Les résultats sont enregistrés et en attente de synchronisation.", importFailed: "Impossible d’enregistrer dans ce navigateur. Vérifiez l’espace disponible puis réessayez.", pendingCount: "{count} opérations en attente", retrySync: "Réessayer la synchronisation", onboardingTitle: "Informations du compte", acceptTerms: "J’ai lu et j’accepte les Conditions.", acknowledgePrivacy: "J’ai lu la Notice de confidentialité.", confirmEligibility: "J’ai lu les critères d’accès au compte affichés et je les respecte.", completeOnboarding: "Confirmer et continuer", policyUnavailable: "Les règles du compte ne sont pas encore configurées. Vous pouvez rester connecté ; la modification et la synchronisation seront disponibles ensuite.", deleteTitle: "Supprimer le compte", deleteDescription: "Le profil, le lien Google, les sessions et les records cloud seront supprimés. Les combats publics ne seront pas supprimés.", deleteConfirm: "Je souhaite supprimer les données de mon compte.", deleteButton: "Supprimer définitivement le compte", deleting: "Suppression…", deleteFreshSession: "Reconnectez-vous avec Google avant la suppression.", deleteFailed: "Impossible de supprimer le compte. Reconnectez-vous et réessayez.",
    sync: { localOnly: "Enregistré dans ce navigateur uniquement", checking: "Vérification", syncing: "Synchronisation", synced: "Synchronisé", offline: "Hors ligne · en attente", loginRequired: "Reconnectez-vous au même compte", failed: "Échec de synchronisation", pending: "Envoi en attente", blocked: "Vérifiez puis réessayez" },
    gameNames: { "brawler-quiz": "Quiz des Brawlers", "silhouette-quiz": "Quiz des silhouettes", "map-quiz": "Quiz des cartes", "ability-quiz": "Quiz des capacités" },
    errorGeneric: "Impossible de terminer la demande. Vérifiez la connexion puis réessayez.",
    errorMessages: { INVALID_NICKNAME: "Utilisez 1 à 32 caractères sans caractère de contrôle.", INVALID_PLAYER_TAG: "Vérifiez le format du tag joueur.", PROFILE_CHANGED: "Le profil a changé dans un autre onglet. Les dernières valeurs ont été chargées.", POLICY_NOT_CONFIGURED: "Les règles du compte ne sont pas encore configurées.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Reconnectez-vous avec Google avant la suppression.", LOGIN_REQUIRED: "Reconnectez-vous pour protéger votre compte." },
  },
  it: {
    navLogin: "Accedi", navAccount: "Account", accountTitle: "Account", accountDescription: "Gestisci nickname, tag giocatore predefinito e record personali dei minigiochi.", disabledTitle: "Account non ancora disponibili", disabledBody: "Le funzioni account non sono disponibili al momento. Le funzioni ospite restano accessibili.", guestTitle: "Un account facoltativo", guestBody: "Ricerca giocatori, minigiochi e preferiti restano disponibili senza accesso.", googleSignIn: "Continua con Google", retry: "Riprova", serviceUnavailable: "Impossibile verificare l’account. Controlla la connessione e riprova.", menuLabel: "Menu account", menuAccount: "Gestisci account", signOut: "Esci", signingOut: "Uscita…", signOutFailed: "Uscita non completata. Riprova.", nickname: "Nickname", nicknamePlaceholder: "1–32 caratteri", playerTag: "Tag giocatore predefinito", playerTagPlaceholder: "Esempio: 2PP", playerTagHelp: "È un tag predefinito di comodità. Non verifica la proprietà e non autorizza a modificare o eliminare le battaglie.", saveProfile: "Salva profilo", saving: "Salvataggio…", clearTag: "Cancella tag", profileSaved: "Profilo salvato.", profileConflict: "Il profilo è cambiato in un’altra scheda. Sono stati caricati i valori più recenti.", personalBests: "Record personali dei minigiochi", noPersonalBests: "Nessun record sincronizzato.", localImportTitle: "Importa i risultati da questo browser", localImportDescription: "Scegliendo l’importazione, solo i risultati validi vengono uniti all’account. I dati locali non vengono cancellati.", localImportCount: "{count} risultati disponibili", noLocalRecords: "Nessun risultato valido da importare.", importRecords: "Importa i record di questo browser", importing: "Preparazione importazione…", importQueued: "Risultati salvati in sicurezza e in attesa di sincronizzazione.", importFailed: "Impossibile salvare nel browser. Controlla lo spazio disponibile e riprova.", pendingCount: "{count} operazioni in attesa", retrySync: "Riprova sincronizzazione", onboardingTitle: "Informative account", acceptTerms: "Ho letto e accetto i Termini.", acknowledgePrivacy: "Ho letto l’Informativa privacy.", confirmEligibility: "Ho letto i requisiti di idoneità mostrati dal servizio e li soddisfo.", completeOnboarding: "Conferma e continua", policyUnavailable: "Le policy dell’account non sono configurate. Puoi restare connesso; modifiche e sincronizzazione saranno disponibili dopo la configurazione.", deleteTitle: "Elimina account", deleteDescription: "Saranno eliminati profilo, collegamento Google, sessioni e record cloud. Le battaglie pubbliche non vengono eliminate.", deleteConfirm: "Voglio eliminare i dati del mio account.", deleteButton: "Elimina account definitivamente", deleting: "Eliminazione…", deleteFreshSession: "Accedi di nuovo con Google prima di eliminare.", deleteFailed: "Impossibile eliminare l’account. Accedi di nuovo e riprova.",
    sync: { localOnly: "Salvato solo in questo browser", checking: "Verifica", syncing: "Sincronizzazione", synced: "Sincronizzato", offline: "Offline · in attesa", loginRequired: "Accedi di nuovo allo stesso account", failed: "Sincronizzazione non riuscita", pending: "Invio in attesa", blocked: "Controlla e riprova" },
    gameNames: { "brawler-quiz": "Quiz sui Brawler", "silhouette-quiz": "Quiz sulle silhouette", "map-quiz": "Quiz sulle mappe", "ability-quiz": "Quiz sulle abilità" },
    errorGeneric: "Impossibile completare la richiesta. Controlla la connessione e riprova.",
    errorMessages: { INVALID_NICKNAME: "Usa 1–32 caratteri senza caratteri di controllo.", INVALID_PLAYER_TAG: "Controlla il formato del tag giocatore.", PROFILE_CHANGED: "Il profilo è cambiato in un’altra scheda. Sono stati caricati i valori attuali.", POLICY_NOT_CONFIGURED: "Le policy dell’account non sono configurate.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Accedi di nuovo con Google prima di eliminare.", LOGIN_REQUIRED: "Accedi di nuovo per proteggere l’account." },
  },
  ru: {
    navLogin: "Войти", navAccount: "Аккаунт", accountTitle: "Аккаунт", accountDescription: "Управляйте псевдонимом, тегом игрока по умолчанию и личными рекордами мини-игр.", disabledTitle: "Аккаунты пока недоступны", disabledBody: "Функции аккаунта сейчас недоступны. Гостевые функции продолжают работать.", guestTitle: "Необязательный аккаунт", guestBody: "Поиск игроков, мини-игры и избранное доступны без входа.", googleSignIn: "Продолжить с Google", retry: "Повторить", serviceUnavailable: "Не удалось проверить аккаунт. Проверьте подключение и повторите попытку.", menuLabel: "Меню аккаунта", menuAccount: "Управление аккаунтом", signOut: "Выйти", signingOut: "Выход…", signOutFailed: "Не удалось завершить выход. Повторите попытку.", nickname: "Псевдоним", nicknamePlaceholder: "1–32 символа", playerTag: "Тег игрока по умолчанию", playerTagPlaceholder: "Например: 2PP", playerTagHelp: "Это тег по умолчанию для удобства. Он не подтверждает владение и не дает права изменять или удалять записи боев.", saveProfile: "Сохранить профиль", saving: "Сохранение…", clearTag: "Очистить тег", profileSaved: "Профиль сохранен.", profileConflict: "Профиль изменился в другой вкладке. Загружены последние данные.", personalBests: "Личные рекорды мини-игр", noPersonalBests: "Синхронизированных рекордов пока нет.", localImportTitle: "Импортировать записи из этого браузера", localImportDescription: "При импорте в аккаунт добавляются только корректные записи. Исходные записи браузера не удаляются.", localImportCount: "Доступно записей для импорта: {count}", noLocalRecords: "Нет корректных записей для импорта.", importRecords: "Импортировать рекорды из браузера", importing: "Подготовка импорта…", importQueued: "Записи сохранены и ожидают синхронизации.", importFailed: "Не удалось сохранить данные в браузере. Проверьте свободное место и повторите попытку.", pendingCount: "Ожидают синхронизации: {count}", retrySync: "Повторить синхронизацию", onboardingTitle: "Информация об аккаунте", acceptTerms: "Я прочитал(-а) Условия и согласен(-на) с ними.", acknowledgePrivacy: "Я прочитал(-а) Уведомление о конфиденциальности.", confirmEligibility: "Я ознакомился(-ась) с требованиями к аккаунту и соответствую им.", completeOnboarding: "Подтвердить и продолжить", policyUnavailable: "Правила аккаунта еще не настроены. Вы можете оставаться в системе; редактирование и синхронизация станут доступны после настройки.", deleteTitle: "Удалить аккаунт", deleteDescription: "Будут удалены профиль, связь с Google, сеансы и облачные рекорды. Публичные записи боев не удаляются.", deleteConfirm: "Я хочу удалить данные своего аккаунта.", deleteButton: "Удалить аккаунт навсегда", deleting: "Удаление…", deleteFreshSession: "Перед удалением войдите через Google повторно.", deleteFailed: "Не удалось удалить аккаунт. Войдите снова и повторите попытку.",
    sync: { localOnly: "Сохранено только в этом браузере", checking: "Проверка", syncing: "Синхронизация", synced: "Синхронизировано", offline: "Нет сети · ожидает отправки", loginRequired: "Войдите в тот же аккаунт повторно", failed: "Ошибка синхронизации", pending: "Ожидает отправки", blocked: "Проверьте данные и повторите" },
    gameNames: { "brawler-quiz": "Викторина о бойцах", "silhouette-quiz": "Викторина по силуэтам", "map-quiz": "Викторина по картам", "ability-quiz": "Викторина по способностям" },
    errorGeneric: "Не удалось выполнить запрос. Проверьте подключение и повторите попытку.",
    errorMessages: { INVALID_NICKNAME: "Используйте от 1 до 32 символов без управляющих символов.", INVALID_PLAYER_TAG: "Проверьте формат тега игрока.", PROFILE_CHANGED: "Профиль изменился в другой вкладке. Загружены актуальные данные.", POLICY_NOT_CONFIGURED: "Правила аккаунта еще не настроены.", FRESH_GOOGLE_SIGN_IN_REQUIRED: "Перед удалением войдите через Google повторно.", LOGIN_REQUIRED: "Войдите повторно для защиты аккаунта." },
  },
};

export function getAccountMessages(locale: Locale) {
  return accountMessages[locale];
}

type LocalizedMode = "3m" | "5m" | "10m" | "practice" | "base" | "standard" | "mixed" | "gadget" | "star-power";

const modeNames: Record<Locale, Record<LocalizedMode, string>> = {
  ko: { "3m": "3분", "5m": "5분", "10m": "10분", practice: "연습", base: "기본", standard: "일반", mixed: "전체", gadget: "가젯", "star-power": "스타 파워" },
  en: { "3m": "3 min", "5m": "5 min", "10m": "10 min", practice: "Practice", base: "Base", standard: "Standard", mixed: "Mixed", gadget: "Gadget", "star-power": "Star Power" },
  ja: { "3m": "3分", "5m": "5分", "10m": "10分", practice: "練習", base: "基本", standard: "標準", mixed: "ミックス", gadget: "ガジェット", "star-power": "スターパワー" },
  "pt-br": { "3m": "3 min", "5m": "5 min", "10m": "10 min", practice: "Prática", base: "Básico", standard: "Padrão", mixed: "Misto", gadget: "Acessório", "star-power": "Poder de Estrela" },
  es: { "3m": "3 min", "5m": "5 min", "10m": "10 min", practice: "Práctica", base: "Básico", standard: "Estándar", mixed: "Mixto", gadget: "Gadget", "star-power": "Habilidad estelar" },
  tr: { "3m": "3 dk", "5m": "5 dk", "10m": "10 dk", practice: "Alıştırma", base: "Temel", standard: "Standart", mixed: "Karışık", gadget: "Aksesuar", "star-power": "Yıldız Gücü" },
  de: { "3m": "3 Min.", "5m": "5 Min.", "10m": "10 Min.", practice: "Übung", base: "Basis", standard: "Standard", mixed: "Gemischt", gadget: "Gadget", "star-power": "Sternenkraft" },
  fr: { "3m": "3 min", "5m": "5 min", "10m": "10 min", practice: "Entraînement", base: "Base", standard: "Standard", mixed: "Mixte", gadget: "Gadget", "star-power": "Pouvoir star" },
  it: { "3m": "3 min", "5m": "5 min", "10m": "10 min", practice: "Allenamento", base: "Base", standard: "Standard", mixed: "Misto", gadget: "Gadget", "star-power": "Stella" },
  ru: { "3m": "3 мин", "5m": "5 мин", "10m": "10 мин", practice: "Тренировка", base: "Базовый", standard: "Стандарт", mixed: "Смешанный", gadget: "Гаджет", "star-power": "Звёздная сила" },
};

export function localizedModeLabel(locale: Locale, mode: string) {
  return mode in modeNames[locale]
    ? modeNames[locale][mode as LocalizedMode]
    : accountMessages[locale].errorGeneric;
}

export function getAccountErrorMessage(locale: Locale, code: unknown) {
  const copy = accountMessages[locale];
  if (typeof code === "string" && code in copy.errorMessages) {
    return copy.errorMessages[code as keyof AccountMessages["errorMessages"]];
  }
  return copy.errorGeneric;
}

export const accountDeletionMessages: Record<Locale, {
  differentAccount: string;
  pendingSignOut: string;
  deleted: string;
  browserCleanupFailed: string;
}> = {
  ko: { differentAccount: "삭제를 요청한 계정과 다른 Google 계정입니다. 원래 계정으로 다시 로그인해야 삭제할 수 있습니다.", pendingSignOut: "동기화 대기 기록 {count}건은 이 브라우저에 보관되며 같은 계정으로 다시 로그인해야 전송됩니다.", deleted: "계정과 계정 데이터가 삭제되었습니다.", browserCleanupFailed: "계정은 삭제했지만 일부 브라우저 저장 데이터를 지우지 못했습니다. 이 사이트의 브라우저 데이터를 직접 삭제해 주세요." },
  en: { differentAccount: "This is a different Google account. Sign in to the account you originally chose for deletion.", pendingSignOut: "{count} pending sync operations will stay in this browser and resume only when you sign in to the same account.", deleted: "Your account and account data have been deleted.", browserCleanupFailed: "Your account was deleted, but some browser data could not be cleared. Clear this site's browser data manually." },
  ja: { differentAccount: "別のGoogleアカウントです。削除を開始した元のアカウントで再度ログインしてください。", pendingSignOut: "同期待ちの{count}件はこのブラウザーに残り、同じアカウントで再ログインした後に送信されます。", deleted: "アカウントとアカウントデータを削除しました。", browserCleanupFailed: "アカウントは削除されましたが、一部のブラウザーデータを消去できませんでした。このサイトのデータを手動で削除してください。" },
  "pt-br": { differentAccount: "Esta é outra conta Google. Entre na conta original para continuar a exclusão.", pendingSignOut: "As {count} operações pendentes ficarão neste navegador e só serão enviadas quando você entrar na mesma conta.", deleted: "Sua conta e os dados da conta foram excluídos.", browserCleanupFailed: "Sua conta foi excluída, mas alguns dados do navegador não puderam ser removidos. Apague manualmente os dados deste site." },
  es: { differentAccount: "Esta es otra cuenta de Google. Inicia sesión en la cuenta original para continuar con la eliminación.", pendingSignOut: "Las {count} operaciones pendientes permanecerán en este navegador y se enviarán al volver a iniciar sesión con la misma cuenta.", deleted: "Se eliminaron tu cuenta y sus datos.", browserCleanupFailed: "La cuenta se eliminó, pero no se pudieron borrar algunos datos del navegador. Borra manualmente los datos de este sitio." },
  tr: { differentAccount: "Bu farklı bir Google hesabı. Silme işlemi için ilk seçtiğin hesapla tekrar giriş yap.", pendingSignOut: "Bekleyen {count} eşitleme işlemi bu tarayıcıda kalır ve yalnızca aynı hesaba tekrar giriş yapıldığında gönderilir.", deleted: "Hesabın ve hesap verilerin silindi.", browserCleanupFailed: "Hesabın silindi ancak bazı tarayıcı verileri temizlenemedi. Bu sitenin tarayıcı verilerini elle sil." },
  de: { differentAccount: "Dies ist ein anderes Google-Konto. Melde dich mit dem ursprünglich gewählten Konto an, um die Löschung fortzusetzen.", pendingSignOut: "{count} ausstehende Synchronisierungen bleiben in diesem Browser und werden erst nach Anmeldung mit demselben Konto gesendet.", deleted: "Dein Konto und die Kontodaten wurden gelöscht.", browserCleanupFailed: "Dein Konto wurde gelöscht, aber einige Browserdaten konnten nicht entfernt werden. Lösche die Browserdaten dieser Website manuell." },
  fr: { differentAccount: "Il s’agit d’un autre compte Google. Connectez-vous au compte initial pour poursuivre la suppression.", pendingSignOut: "Les {count} opérations en attente restent dans ce navigateur et ne seront envoyées qu’après reconnexion au même compte.", deleted: "Votre compte et ses données ont été supprimés.", browserCleanupFailed: "Votre compte a été supprimé, mais certaines données du navigateur n’ont pas pu être effacées. Supprimez manuellement les données de ce site." },
  it: { differentAccount: "Questo è un altro account Google. Accedi all’account iniziale per continuare l’eliminazione.", pendingSignOut: "Le {count} operazioni in attesa restano in questo browser e saranno inviate solo accedendo di nuovo allo stesso account.", deleted: "Il tuo account e i relativi dati sono stati eliminati.", browserCleanupFailed: "L’account è stato eliminato, ma non è stato possibile cancellare alcuni dati del browser. Elimina manualmente i dati di questo sito." },
  ru: { differentAccount: "Это другой аккаунт Google. Войдите в исходный аккаунт, чтобы продолжить удаление.", pendingSignOut: "Ожидающие операции ({count}) останутся в этом браузере и отправятся только после повторного входа в тот же аккаунт.", deleted: "Аккаунт и связанные данные удалены.", browserCleanupFailed: "Аккаунт удален, но часть данных браузера очистить не удалось. Удалите данные этого сайта вручную." },
};

export function getAccountDeletionMessages(locale: Locale) {
  return accountDeletionMessages[locale];
}
