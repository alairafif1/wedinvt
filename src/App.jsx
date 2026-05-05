import { useEffect, useRef, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

const eventDetails = [
  {
    label: 'Akad Nikah',
    date: 'Sabtu, 14 September 2026',
    time: '08.00 WIB',
    place: 'Pendopo Ageng Sasono Mulyo',
    address: 'Jl. Imogiri Timur No. 27, Bantul, Yogyakarta',
  },
  {
    label: 'Resepsi',
    date: 'Sabtu, 14 September 2026',
    time: '11.00 - 14.00 WIB',
    place: 'Pendopo Ageng Sasono Mulyo',
    address: 'Jl. Imogiri Timur No. 27, Bantul, Yogyakarta',
  },
]

const galleryItems = [
  'Momen bahagia bersama keluarga',
  'Senyum hangat kedua mempelai',
  'Detail dekorasi hari pernikahan',
  'Suasana penuh doa dan restu',
  'Kebersamaan dengan sahabat',
  'Kenangan indah hari bahagia',
]

const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD ?? 'admin123'

const attendanceLabels = {
  hadir: 'Hadir',
  tidak_hadir: 'Tidak Hadir',
  ragu: 'Masih Ragu',
}

const formatDate = (date) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const downloadCsv = (filename, rows) => {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const escapeCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function AdminPage() {
  const [password, setPassword] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(
    () => localStorage.getItem('wedding-admin') === 'true',
  )
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminNotice, setAdminNotice] = useState('')
  const [rsvps, setRsvps] = useState([])
  const [adminMessages, setAdminMessages] = useState([])

  const fetchAdminData = async () => {
    setAdminLoading(true)
    setAdminNotice('')

    const [rsvpResult, messageResult] = await Promise.all([
      supabase
        .from('rsvps')
        .select('id, guest_name, attendance, guest_count, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('id, guest_name, message, created_at')
        .order('created_at', { ascending: false }),
    ])

    setAdminLoading(false)

    if (rsvpResult.error || messageResult.error) {
      setAdminNotice(
        'Data belum bisa dibaca. Pastikan policy SELECT untuk tabel rsvps dan messages sudah diaktifkan di Supabase.',
      )
      return
    }

    setRsvps(rsvpResult.data ?? [])
    setAdminMessages(messageResult.data ?? [])
  }

  useEffect(() => {
    if (!isUnlocked) return

    let isMounted = true

    Promise.all([
      supabase
        .from('rsvps')
        .select('id, guest_name, attendance, guest_count, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('id, guest_name, message, created_at')
        .order('created_at', { ascending: false }),
    ]).then(([rsvpResult, messageResult]) => {
      if (!isMounted) return

      setAdminLoading(false)

      if (rsvpResult.error || messageResult.error) {
        setAdminNotice(
          'Data belum bisa dibaca. Pastikan policy SELECT untuk tabel rsvps dan messages sudah diaktifkan di Supabase.',
        )
        return
      }

      setRsvps(rsvpResult.data ?? [])
      setAdminMessages(messageResult.data ?? [])
    })

    return () => {
      isMounted = false
    }
  }, [isUnlocked])

  const handleLogin = (event) => {
    event.preventDefault()

    if (password !== adminPassword) {
      setAdminNotice('Password admin tidak sesuai.')
      return
    }

    localStorage.setItem('wedding-admin', 'true')
    setIsUnlocked(true)
    setPassword('')
  }

  const handleLogout = () => {
    localStorage.removeItem('wedding-admin')
    setIsUnlocked(false)
    setRsvps([])
    setAdminMessages([])
  }

  const totalPresent = rsvps.filter((item) => item.attendance === 'hadir').length
  const totalAbsent = rsvps.filter((item) => item.attendance === 'tidak_hadir').length
  const totalUnsure = rsvps.filter((item) => item.attendance === 'ragu').length
  const totalGuests = rsvps
    .filter((item) => item.attendance === 'hadir')
    .reduce((total, item) => total + Number(item.guest_count || 0), 0)

  if (!isUnlocked) {
    return (
      <main className="admin-shell">
        <section className="admin-login-card">
          <div className="section-kicker">Admin</div>
          <h1>Dashboard Keluarga</h1>
          <p>Masukkan password admin untuk melihat data RSVP dan ucapan tamu.</p>

          {adminNotice && <div className="admin-alert">{adminNotice}</div>}

          <form onSubmit={handleLogin} className="admin-login-form">
            <label>
              Password Admin
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                required
              />
            </label>
            <button className="primary-button" type="submit">
              Masuk Dashboard
            </button>
          </form>
          <a className="ghost-button" href="/">
            Kembali ke Undangan
          </a>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <section className="admin-dashboard">
        <div className="admin-header">
          <div>
            <div className="section-kicker">Admin</div>
            <h1>Dashboard RSVP</h1>
            <p>Kelola konfirmasi kehadiran dan ucapan tamu Idan & Mirna.</p>
          </div>
          <div className="admin-actions">
            <button className="ghost-button" type="button" onClick={fetchAdminData}>
              Refresh Data
            </button>
            <button className="ghost-button" type="button" onClick={handleLogout}>
              Keluar
            </button>
          </div>
        </div>

        {adminNotice && <div className="admin-alert">{adminNotice}</div>}

        <div className="admin-stat-grid">
          <article>
            <span>Hadir</span>
            <strong>{totalPresent}</strong>
          </article>
          <article>
            <span>Total Tamu</span>
            <strong>{totalGuests}</strong>
          </article>
          <article>
            <span>Tidak Hadir</span>
            <strong>{totalAbsent}</strong>
          </article>
          <article>
            <span>Masih Ragu</span>
            <strong>{totalUnsure}</strong>
          </article>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Data RSVP</h2>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                downloadCsv(
                  'rsvp-idan-mirna.csv',
                  rsvps.map((item) => ({
                    nama: item.guest_name,
                    status: attendanceLabels[item.attendance] ?? item.attendance,
                    jumlah_tamu: item.guest_count,
                    waktu: formatDate(item.created_at),
                  })),
                )
              }
            >
              Export RSVP
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Status</th>
                  <th>Jumlah</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {rsvps.map((item) => (
                  <tr key={item.id}>
                    <td>{item.guest_name}</td>
                    <td>{attendanceLabels[item.attendance] ?? item.attendance}</td>
                    <td>{item.guest_count}</td>
                    <td>{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rsvps.length && <p className="admin-empty">Belum ada data RSVP.</p>}
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Ucapan Tamu</h2>
            <button
              className="secondary-button"
              type="button"
              onClick={() =>
                downloadCsv(
                  'ucapan-idan-mirna.csv',
                  adminMessages.map((item) => ({
                    nama: item.guest_name,
                    ucapan: item.message,
                    waktu: formatDate(item.created_at),
                  })),
                )
              }
            >
              Export Ucapan
            </button>
          </div>
          <div className="admin-message-grid">
            {adminMessages.map((item) => (
              <article className="admin-message-card" key={item.id}>
                <strong>{item.guest_name}</strong>
                <p>{item.message}</p>
                <small>{formatDate(item.created_at)}</small>
              </article>
            ))}
          </div>
          {!adminMessages.length && <p className="admin-empty">Belum ada ucapan tamu.</p>}
        </div>

        {adminLoading && <div className="admin-loading">Memuat data...</div>}
      </section>
    </main>
  )
}

function WeddingInvitation() {
  const [rsvpName, setRsvpName] = useState('')
  const [attendance, setAttendance] = useState('hadir')
  const [guestCount, setGuestCount] = useState(1)
  const [msgText, setMsgText] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [musicOn, setMusicOn] = useState(false)
  const audioContextRef = useRef(null)
  const musicNodesRef = useRef(null)

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('id, guest_name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(6)

    if (!error) {
      setMessages(data ?? [])
    }
  }

  useEffect(() => {
    let isMounted = true

    supabase
      .from('messages')
      .select('id, guest_name, message, created_at')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (isMounted && !error) {
          setMessages(data ?? [])
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const revealItems = document.querySelectorAll('.page-section')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.18 },
    )

    revealItems.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => {
      musicNodesRef.current?.forEach((node) => node.stop?.())
      audioContextRef.current?.close()
    }
  }, [])

  const stopMusic = () => {
    musicNodesRef.current?.forEach((node) => node.stop?.())
    musicNodesRef.current = null
    setMusicOn(false)
  }

  const toggleMusic = async () => {
    if (musicOn) {
      stopMusic()
      return
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext
    const audioContext = audioContextRef.current ?? new AudioContext()
    audioContextRef.current = audioContext
    await audioContext.resume()

    const masterGain = audioContext.createGain()
    const notes = [261.63, 329.63, 392]
    const oscillators = notes.map((frequency, index) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()

      oscillator.type = index === 1 ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      gain.gain.value = index === 0 ? 0.018 : 0.012
      oscillator.connect(gain).connect(masterGain)
      oscillator.start()

      return oscillator
    })

    masterGain.gain.value = 0.9
    masterGain.connect(audioContext.destination)
    musicNodesRef.current = [...oscillators, masterGain]
    setMusicOn(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setNotice('')

    const { error: rsvpError } = await supabase.from('rsvps').insert({
      guest_name: rsvpName.trim(),
      attendance,
      guest_count: Number(guestCount),
    })

    if (rsvpError) {
      setLoading(false)
      setNotice(`RSVP gagal dikirim: ${rsvpError.message}`)
      return
    }

    const { error: messageError } = await supabase.from('messages').insert({
      guest_name: rsvpName.trim(),
      message: msgText.trim(),
    })

    setLoading(false)

    if (messageError) {
      setNotice(`RSVP tersimpan, tetapi ucapan gagal dikirim: ${messageError.message}`)
      return
    }

    setNotice('RSVP dan ucapan berhasil dikirim. Matur nuwun!')
    setRsvpName('')
    setAttendance('hadir')
    setGuestCount(1)
    setMsgText('')
    fetchMessages()
  }

  return (
    <main className="invitation-shell">
      <button
        className={`music-toggle ${musicOn ? 'is-playing' : ''}`}
        type="button"
        onClick={toggleMusic}
        aria-label={musicOn ? 'Matikan musik' : 'Nyalakan musik'}
      >
        <span aria-hidden="true">{musicOn ? 'II' : '♪'}</span>
        {musicOn ? 'Musik On' : 'Musik Off'}
      </button>

      <nav className="top-nav" aria-label="Navigasi undangan">
        <a href="#home">Pembuka</a>
        <a href="#acara">Acara</a>
        <a href="#galeri">Galeri</a>
        <a href="#lokasi">Lokasi</a>
        <a href="#rsvp">RSVP</a>
      </nav>

      <section className="hero-section page-section is-visible" id="home">
        <div className="batik-orb batik-orb-left" aria-hidden="true" />
        <div className="batik-orb batik-orb-right" aria-hidden="true" />

        <div className="hero-card reveal-up">
          <div className="invitation-art" aria-hidden="true">
            <div className="sun-disc" />
            <div className="gunungan">
              <span />
              <span />
              <span />
            </div>
            <div className="couple-illustration">
              <div className="figure bride-figure">
                <i />
              </div>
              <div className="figure groom-figure">
                <i />
              </div>
            </div>
            <div className="jasmine jasmine-left" />
            <div className="jasmine jasmine-right" />
          </div>
          <p className="eyebrow">Undangan Pernikahan</p>
          <div className="javanese-gate" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>Idan & Mirna</h1>
          <p className="hero-copy">
            Dengan penuh kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i
            untuk hadir dan memberikan doa restu pada hari pernikahan kami.
          </p>
          <div className="date-ribbon">
            <span>Sabtu</span>
            <strong>14.09.2026</strong>
            <span>Yogyakarta</span>
          </div>
          <a className="primary-button" href="#acara">Buka Undangan</a>
        </div>
      </section>

      <section className="blessing-section section-pad page-section">
        <div className="section-kicker">Bismillahirrahmanirrahim</div>
        <h2>Dengan memohon rahmat Tuhan Yang Maha Esa</h2>
        <p>
          Tanpa mengurangi rasa hormat, kami bermaksud menyelenggarakan akad dan
          resepsi pernikahan putra-putri kami dalam suasana yang hangat, tertib,
          dan penuh rasa syukur.
        </p>

        <div className="couple-grid">
          <article className="couple-card">
            <div className="portrait portrait-groom" aria-hidden="true">
              <span>I</span>
            </div>
            <p>Putra dari Bapak Wirawan & Ibu Niken Sekar</p>
            <h3>Hazidan Hanafi</h3>
          </article>
          <div className="ampersand" aria-hidden="true">&</div>
          <article className="couple-card">
            <div className="portrait portrait-bride" aria-hidden="true">
              <span>M</span>
            </div>
            <p>Putri dari Bapak Hadi Santoso & Ibu Sri Lestari</p>
            <h3>Mirna Yustiana</h3>
          </article>
        </div>
      </section>

      <section className="event-section section-pad page-section" id="acara">
        <div className="section-kicker">Detail Acara</div>
        <h2>Rangkaian Acara</h2>
        <div className="event-grid">
          {eventDetails.map((event) => (
            <article className="event-card" key={event.label}>
              <p>{event.label}</p>
              <h3>{event.date}</h3>
              <strong>{event.time}</strong>
              <span>{event.place}</span>
              <small>{event.address}</small>
            </article>
          ))}
        </div>
        <a
          className="secondary-button"
          href="#lokasi"
        >
          Lihat Lokasi
        </a>
      </section>

      <section className="gallery-section section-pad page-section" id="galeri">
        <div className="section-kicker">Galeri</div>
        <h2>Momen Bahagia</h2>
        <p>
          Beberapa momen yang kami abadikan sebagai bagian dari hari bahagia ini.
        </p>
        <div className="gallery-grid">
          {galleryItems.map((item) => (
            <article className="gallery-card" key={item}>
              <div className="gallery-pattern" aria-hidden="true" />
            </article>
          ))}
        </div>
      </section>

      <section className="map-section section-pad page-section" id="lokasi">
        <div className="map-card">
          <div>
            <div className="section-kicker">Lokasi</div>
            <h2>Tempat Acara</h2>
            <p>
              Acara akan diselenggarakan di Pendopo Ageng Sasono Mulyo,
              Yogyakarta. Silakan gunakan peta berikut untuk mendapatkan arah
              menuju lokasi.
            </p>
            <a
              className="primary-button"
              href="https://maps.google.com/?q=Pendopo%20Ageng%20Sasono%20Mulyo%20Yogyakarta"
              target="_blank"
              rel="noreferrer"
            >
              Buka Google Maps
            </a>
          </div>
          <div className="map-frame">
            <iframe
              title="Lokasi Pendopo Ageng Sasono Mulyo"
              src="https://maps.google.com/maps?q=Pendopo%20Ageng%20Sasono%20Mulyo%20Yogyakarta&t=&z=14&ie=UTF8&iwloc=&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <section className="rsvp-section section-pad page-section" id="rsvp">
        <div className="rsvp-card">
          <div className="section-kicker">RSVP</div>
          <h2>Konfirmasi Kehadiran</h2>
          <p>
            Kehadiran dan doa restu panjenengan adalah hadiah terindah bagi kami.
            Silakan kirim RSVP dan ucapan melalui satu form sederhana di bawah ini.
          </p>

          {notice && <div className="form-notice">{notice}</div>}

          <div className="form-grid single-form-grid">
            <form onSubmit={handleSubmit} className="wedding-form combined-form">
              <div className="form-heading">
                <span>01</span>
                <h3>RSVP & Ucapan</h3>
              </div>

              <label>
                Nama Tamu
                <input
                  type="text"
                  placeholder="Contoh: Bapak Andi"
                  value={rsvpName}
                  onChange={(event) => setRsvpName(event.target.value)}
                  required
                />
              </label>

              <label>
                Status Kehadiran
                <select
                  value={attendance}
                  onChange={(event) => setAttendance(event.target.value)}
                >
                  <option value="hadir">Hadir</option>
                  <option value="tidak_hadir">Tidak Hadir</option>
                  <option value="ragu">Masih Ragu</option>
                </select>
              </label>

              <label>
                Jumlah Tamu
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={guestCount}
                  onChange={(event) => setGuestCount(event.target.value)}
                  required
                />
              </label>

              <label>
                Ucapan dan Doa
                <textarea
                  placeholder="Tulis ucapan terbaik untuk kedua mempelai..."
                  value={msgText}
                  onChange={(event) => setMsgText(event.target.value)}
                  maxLength={500}
                  required
                />
              </label>

              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim RSVP & Ucapan'}
              </button>
            </form>
          </div>

          <div className="message-list">
            <div className="form-heading message-list-heading">
              <span>02</span>
              <h3>Ucapan Terbaru</h3>
            </div>
            {messages.length > 0 ? (
              <div className="message-items">
                {messages.map((item) => (
                  <article className="message-card" key={item.id}>
                    <strong>{item.guest_name}</strong>
                    <p>{item.message}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-message">Belum ada ucapan. Jadilah yang pertama mengirim doa.</p>
            )}
          </div>

          <a className="ghost-button contact-button" href="tel:+6281234567890">
            Hubungi Keluarga
          </a>
        </div>
      </section>

      <section className="thanks-section section-pad page-section">
        <div className="thanks-card">
          <div className="thanks-ornament" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="section-kicker">Terima Kasih</div>
          <h2>Atas Doa dan Kehadiran Anda</h2>
          <p>
            Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila
            Bapak/Ibu/Saudara/i berkenan hadir serta memberikan doa restu untuk
            pernikahan kami.
          </p>
          <div className="thanks-divider" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <strong>Idan & Mirna</strong>
          <small>Sabtu, 14 September 2026</small>
        </div>
      </section>
    </main>
  )
}

function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPage />
  }

  return <WeddingInvitation />
}

export default App
