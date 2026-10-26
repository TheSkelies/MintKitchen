declare module 'auth/AuthApp' {
  const AuthApp: React.ComponentType<{
    path?: string;
    onGoRegister?: () => void;
    onGoLogin?: () => void;
    onSuccess?: () => void;
    onLogout?: () => void;
    onOpenRecipe?: (id: string) => void;  // ← ДОБАВЛЕНО
  }>;
  export default AuthApp;
}

declare module 'home/HomeApp' {
  const HomeApp: React.ComponentType;
  export default HomeApp;
}

declare module 'recipes/mount' {
  export const mount: (el: HTMLElement) => () => void;
}

declare module 'video/mount' {
  export const mount: (el: HTMLElement) => () => void;
}

declare module 'admin/mount' {
  export const mount: (el: HTMLElement) => () => void;
}
