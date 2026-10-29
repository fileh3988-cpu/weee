import { createClient } from '@supabase/supabase-js'

export default async function Home() {
  // Hardcode langsung untuk test
  const supabase = createClient(
    'https://nudrpcdmbclagmnpeotw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51ZHJwY2RtYmNsYWdtbnBlb3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMTg2NjksImV4cCI6MjEwODU5NDY2OX0.dG6D0orV_QBEC1R0TkRFz2o2WgJyguuOqsSsMU-k7eI'
  )
  
  const { data, error } = await supabase.from('events').select('*')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">🎉 Final Test</h1>
      
      {error ? (
        <div className="bg-red-100 p-4 rounded">
          <p className="text-red-600 font-bold">❌ Error:</p>
          <p className="text-red-600">{error.message}</p>
          <p className="text-red-600 text-sm mt-2">Details: {JSON.stringify(error)}</p>
        </div>
      ) : (
        <div className="bg-green-100 p-4 rounded">
          <p className="text-green-600 font-bold text-xl">✅ BERHASIL!</p>
          <p className="text-green-600 mt-2">Jumlah event di database: {data ? data.length : 0}</p>
        </div>
      )}
    </main>
  )
}