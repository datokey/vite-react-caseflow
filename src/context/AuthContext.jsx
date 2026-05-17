import { use } from "react";

const AuthContext = React.createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    //1. cek status login saat aplikasi pertama kali dimuat (refresh check)
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const response = await fetch(`${process.env.AUTH_URI}/me`, {
                    method: 'GET',
                   // mengirimkan Httponly cookie secara otomatis ke backend
                    credentials: 'include',
                });

                if (response.ok) {
                    const data= await response.json();
                    setUser(data.user); // Simpan data user ke state
                } else {
                    setUser(null); // Pastikan user tetap null jika tidak berhasil
                }
            } catch (error) {
                    console.error('Gagal mengecek status autentikasi:', error);
                    setUser(null); // Pastikan user tetap null jika terjadi error
            } finally {
                    setLoading(false); // Selesai loading setelah cek status
            }   
        };

        checkAuthStatus();
    }, []);

    //2. fungsi login
    const login = async (email, password) => {
        try {
            const response = await fetch(`${process.env.AUTH_URI}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
                return { success: true };
            } else {
                return { success: false, error: 'Login gagal' };
            }
        } catch (error) {
            console.error('Error during login:', error);
            return { success: false, error: 'Terjadi kesalahan pada server' };
        }
    };

    //3. fungsi logout
    const logout = async () => {
        try {
            // beritahu backend untuk menghapus cookie dengan mengakses endpoint logout
            const response = await fetch(`${process.env.AUTH_URI}/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            //hapus state user di frontend agar UI langsung update
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return React.useContext(AuthContext);
};
