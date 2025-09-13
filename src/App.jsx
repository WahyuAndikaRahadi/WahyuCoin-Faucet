import React, { useState, useEffect } from "react";
import { ethers, BrowserProvider } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCube, faCoins, faWallet, faCheckCircle, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { SparklesIcon, GlobeAltIcon, PuzzlePieceIcon, HomeIcon, LightBulbIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';
import Particles from './components/Particle';
import CountUp from './components/CountUp'; // Pastikan ini diimpor

const faucetAbi = [
  "function requestTokens() public",
  // Anda mungkin perlu menambahkan fungsi untuk mendapatkan sisa token jika ada
  // "function remainingTokens() public view returns (uint256)"
];

const App = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [signer, setSigner] = useState(null);
  const [fcContract, setFcContract] = useState(null);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Untuk menampilkan sisa token
  const [totalWycRemaining, setTotalWycRemaining] = useState(30000000); // Mulai dengan 30.000.000

  const faucetContractAddress = "0x2B13aB562230864eF16cd65237129eFD4FDeFcd4";

  const faucetContract = (provider) => {
    return new ethers.Contract(
      faucetContractAddress,
      faucetAbi,
      provider
    );
  };

  useEffect(() => {
    getCurrentWalletConnected();
    addWalletListener();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsButtonDisabled(false);
    }
  }, [countdown]);

  // Effect to manage body scroll
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Fungsi untuk memperbarui sisa token
  const updateRemainingTokens = (tokensClaimed) => {
    setTotalWycRemaining(prevCount => Math.max(0, prevCount - tokensClaimed));
  };

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        setIsLoading(true);
        setWithdrawError("");
        setWithdrawSuccess("");
        const provider = new BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setSigner(signer);
        setFcContract(faucetContract(provider));
        setWalletAddress(address);
      } catch (err) {
        setWithdrawError("Koneksi dompet gagal. Pastikan MetaMask terinstal.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setWithdrawError("Silakan instal MetaMask atau dompet Ethereum lainnya!");
    }
  };

  const getCurrentWalletConnected = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          const signer = await provider.getSigner(accounts[0].address);
          setSigner(signer);
          setFcContract(faucetContract(provider));
          setWalletAddress(accounts[0].address);
          // Di sini Anda bisa memanggil fungsi untuk mengambil sisa token dari smart contract jika ada
          // Misalnya: const remaining = await fcContract.remainingTokens(); setTotalWycRemaining(Number(remaining));
        }
      } catch (err) {
        console.error(err.message);
      }
    }
  };

  const addWalletListener = async () => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          // Mungkin perlu reset state lain seperti withdrawError/Success
        } else {
          setWalletAddress("");
          setSigner(null);
          setFcContract(null);
        }
      });
    }
  };

  const startCountdown = () => {
    setCountdown(60);
    setIsButtonDisabled(true);
  };

  const getWYCHandler = async () => {
    setWithdrawError("");
    setWithdrawSuccess("");
    setIsLoading(true);
    try {
      if (!signer) {
        setWithdrawError("Tidak ada dompet yang terhubung.");
        setIsLoading(false);
        return;
      }

      const fcContractWithSigner = fcContract.connect(signer);
      const transaction = await fcContractWithSigner.requestTokens();
      await transaction.wait(); // Tunggu transaksi selesai

      setWithdrawSuccess("Operasi berhasil! Token sedang dalam perjalanan.");
      startCountdown();
      updateRemainingTokens(50); // Kurangi 50 token WYC yang diklaim

    } catch (err) {
      let errorMessage = "Terjadi kesalahan saat meminta token.";
      if (err.message && err.message.includes("You must wait")) {
        errorMessage = "Anda harus menunggu 60 detik sebelum dapat meminta token lagi.";
      } else if (err.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Alamat ini telah mengklaim token. Silakan tunggu 60 detik atau gunakan alamat lain.";
      } else if (err.message.includes("ERC20: transfer amount exceeds balance")) {
        errorMessage = "Faucet kehabisan token. Mohon maaf, silakan coba lagi nanti.";
        updateRemainingTokens(0); // Tidak ada token yang diklaim
      }
      else {
        errorMessage = err.message || errorMessage;
      }
      setWithdrawError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) {
      return "Memproses...";
    }
    if (isButtonDisabled) {
      return `Tunggu (${countdown}s)`;
    }
    return "Dapatkan 50 WYC";
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
      },
    },
  };

  const navLinks = [
    { href: "#home", label: "Home", icon: HomeIcon },
    { href: "#what-is-faucet", label: "Apa itu Faucet?", icon: LightBulbIcon },
    { href: "#about-wyc", label: "Tentang WYC", icon: PuzzlePieceIcon },
    { href: "#claim-wyc", label: "Klaim WYC", icon: GlobeAltIcon },
  ];

  // Mobile menu variants
  const menuVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    exit: { opacity: 0, y: -50, transition: { duration: 0.3 } },
  };

  const linkVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    }),
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans overflow-x-hidden relative">
      {/* New Particles Background - Placed to cover the entire page */}
      <div className="absolute inset-0 z-0">
        <Particles
          particleColors={['#ffffff', '#ffffff']}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      {/*Navbar */}
      <nav className="fixed w-full z-50 top-0 bg-gray-950 bg-opacity-30 backdrop-filter backdrop-blur-lg border-b border-gray-700">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <a href="#home" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 transition-colors duration-300">
            WahyuCoin
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                className="text-gray-300 hover:text-emerald-400 transition-colors duration-300 font-medium flex items-center gap-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
              </motion.a>
            ))}
          </div>

          {/* Mobile Hamburger Menu */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white z-50 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMenuOpen ? "close" : "open"}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMenuOpen ? <XMarkIcon className="h-8 w-8 text-teal-400" /> : <Bars3Icon className="h-8 w-8 text-teal-400" />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-gray-950 bg-opacity-95 backdrop-filter backdrop-blur-lg flex flex-col items-center justify-center space-y-8"
          >
            {navLinks.map((link, index) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-300 hover:text-emerald-400 transition-colors duration-300 text-3xl font-bold py-2 flex items-center gap-4"
                variants={linkVariants}
                custom={index}
              >
                <link.icon className="h-8 w-8" />
                <span>{link.label}</span>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 p-4 pt-20">

        {/* Hero Section */}
        <section id="home" className="min-h-screen flex items-center justify-center text-center">
          <motion.div
            className="max-w-4xl backdrop-filter backdrop-blur-lg bg-white bg-opacity-10 p-8 md:p-12 rounded-3xl shadow-2xl border border-white border-opacity-20"
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <SparklesIcon className="h-16 w-16 text-teal-400 mx-auto mb-4 animate-pulse" />
            <motion.h1
              className="text-5xl md:text-7xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              WahyuCoin Faucet
            </motion.h1>
            <motion.p
              className="text-xl md:text-2xl text-gray-200 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Dapatkan token uji coba WahyuCoin (WYC) di jaringan Sepolia Testnet untuk kebutuhan pengembangan DApps Anda.
            </motion.p>
            <motion.a
              href="#claim-wyc"
              className="inline-block bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
            >
              Klaim Token Sekarang
            </motion.a>
          </motion.div>
        </section>

        {/* What is a Faucet Section */}
        <section id="what-is-faucet" className="py-20">
          <motion.div
            className="container mx-auto max-w-5xl text-center"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-4xl font-bold text-teal-400 mb-4">Apa Itu Faucet Kripto?</h2>
            <p className="text-gray-300 mb-10 text-lg">
              Sebuah pintu gerbang untuk pengujian dan eksplorasi.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              {[
                { icon: PuzzlePieceIcon, title: 'Token Uji Coba', description: 'Memungkinkan pengembang menguji smart contract mereka tanpa risiko finansial di jaringan uji coba.' },
                { icon: GlobeAltIcon, title: 'Edukasi Pengguna', description: 'Memberikan cara yang aman bagi pengguna baru untuk berinteraksi dengan teknologi blockchain dan token.' },
                { icon: SparklesIcon, title: 'Inovasi Cepat', description: 'Mempercepat proses pengembangan dan iterasi, mendorong inovasi di seluruh ekosistem blockchain.' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:shadow-xl transition-shadow duration-300"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                >
                  <item.icon className="h-12 w-12 text-cyan-400 mb-4" />
                  <h3 className="text-2xl font-semibold mb-2 text-white">{item.title}</h3>
                  <p className="text-gray-400">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>



        {/* About WYC Section */}
        <section id="about-wyc" className="py-20">
          <motion.div
            className="container mx-auto max-w-4xl text-center"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-4xl font-bold text-teal-400 mb-4">Tentang WahyuCoin (WYC)</h2>
            <p className="text-gray-300 mb-10 text-lg">
              Dibuat dengan semangat belajar dan eksplorasi oleh Wahyu Andika Rahadi.
            </p>
            <motion.div
              className="bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-gray-700 text-left"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <FontAwesomeIcon icon={faCube} className="text-4xl text-cyan-400 mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Detail Teknis Token</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-400 mt-4">
                <li>Nama: WahyuCoin (WYC)</li>
                <li>Jaringan: Ethereum Sepolia Testnet</li>
                <li>Standar: ERC20</li>
                <li>
                  Alamat Kontrak:
                  <a href="https://sepolia.etherscan.io/address/0x2B13aB562230864eF16cd65237129eFD4FDeFcd4" target="_blank" rel="noopener noreferrer"
                    className="underline text-blue-400 hover:text-blue-300 break-all">
                    0x2B13aB562230864eF16cd65237129eFD4FDeFcd4
                  </a>
                </li>
              </ul>
              <p className="mt-6 text-gray-400">
                Anggap saja WahyuCoin sebagai token "mainan" Anda! Ini adalah alat sempurna untuk belajar cara kerja blockchain, membuat dApps, dan bereksperimen dengan teknologi Web3 tanpa risiko finansial.
              </p>
            </motion.div>
          </motion.div>
        </section>

        <section id="remaining-wyc" className="py-20">
          <motion.div
            className="container mx-auto max-w-md text-center"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-4xl font-bold text-teal-400 mb-4">Total WYC Tersisa</h2>
            <p className="text-gray-400 mb-6">
              Jumlah token WahyuCoin yang siap diklaim:
            </p>
            <motion.div
              className="bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-gray-700"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <FontAwesomeIcon icon={faCoins} className="text-4xl text-cyan-400 mb-4" />
              <div className="text-5xl font-bold text-white">
                {/* Menggunakan CountUp untuk menampilkan sisa token */}
                <CountUp
                  from={0} // Mulai dari 0 agar animasi terlihat saat elemen masuk viewport
                  to={totalWycRemaining}
                  separator=","
                  direction="up"
                  duration={2} // Durasi animasi yang lebih lama untuk angka besar
                  className="count-up-text"
                />
              </div>
              <p className="text-gray-400 mt-4">Token WYC</p>
            </motion.div>
          </motion.div>
        </section>

        {/* Claim WYC Section */}
        <section id="claim-wyc" className="py-20">
          <motion.div
            className="container mx-auto max-w-md text-center"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <h2 className="text-4xl font-bold text-teal-400 mb-4">Klaim Token WYC</h2>
            <p className="text-gray-400 mb-6">
              Sambungkan dompet Anda dan klaim token WYC gratis.
            </p>

            <motion.div
              className="bg-gray-800 bg-opacity-30 backdrop-filter backdrop-blur-lg p-8 rounded-3xl shadow-xl border border-gray-700"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <FontAwesomeIcon icon={faWallet} className="text-4xl text-cyan-400 mb-4" />
              <h3 className="text-xl font-semibold mb-4">Langkah 1: Sambungkan Dompet</h3>
              <button
                onClick={connectWallet}
                className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  walletAddress ? `Terhubung: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` : "Sambungkan Dompet"
                )}
              </button>

              {walletAddress && (
                <>
                  <h3 className="text-xl font-semibold mt-8 mb-4">Langkah 2: Klaim Token</h3>
                  <motion.button
                    onClick={getWYCHandler}
                    disabled={isButtonDisabled || isLoading}
                    className={`w-full font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 transform ${isButtonDisabled || isLoading
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                      }`}
                    whileHover={{ scale: (isButtonDisabled || isLoading) ? 1 : 1.05 }}
                    whileTap={{ scale: (isButtonDisabled || isLoading) ? 1 : 0.95 }}
                  >
                    {getButtonText()}
                  </motion.button>
                </>
              )}

              {withdrawError && (
                <motion.div
                  className="mt-4 p-4 bg-red-800 bg-opacity-50 backdrop-filter backdrop-blur-sm text-white rounded-lg flex items-center gap-2"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-xl" />
                  <p>{withdrawError}</p>
                </motion.div>
              )}

              {withdrawSuccess && (
                <motion.div
                  className="mt-4 p-4 bg-green-700 bg-opacity-50 backdrop-filter backdrop-blur-sm text-white rounded-lg flex items-center gap-2"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FontAwesomeIcon icon={faCheckCircle} className="text-xl" />
                  <p>{withdrawSuccess}</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </section>

        {/* Bagian Baru: Total WYC Tersisa */}


      </div>
    </div>
  );
};

export default App;