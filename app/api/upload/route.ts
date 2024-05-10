import multer from 'multer';
import { promises as fs } from 'fs';
import { getWhisperTranscription } from '@/app/actions';

export const config = {
  api: {
    bodyParser: false, // Kertoo Next.js:lle, ettei se käytä omaa kehon jäsentäjää.
  },
};

const storage = multer.diskStorage({
  destination: './public/uploads/', // Varmista, että tämä kansio on olemassa.
  filename: (req, file, cb) => cb(null, file.originalname),
});

const upload = multer({ storage });

export default function handler(req:any, res:any) {
    console.log("upload calleds");
    
  // Tarkista, että pyyntö on POST-metodilla
  if (req.method === 'POST') {
    // Käsittele tiedoston lataus
    upload.single('file')(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(500).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: 'Unknown error occurred when uploading.' });
      }

      // Tässä kohtaa tiedosto on ladattu, joten voit jatkaa käsittelyä.
      try {
        const transcript = await getWhisperTranscription(req.file.path);
        res.status(200).json({ transcript });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
      }
    });
  } else {
    // Jos ei ole POST-pyyntö, palauta 405 Method Not Allowed
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}