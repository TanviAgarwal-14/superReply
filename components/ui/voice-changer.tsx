'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Upload, Download, Mic, Volume2 } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'

export default function VoiceChanger() {
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signInWithOtp({ email: 'anonymous@example.com' })
      }
    }
    checkSession()
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError('')

    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File is too large. Please upload a file smaller than 5MB.')
        return
      }

      if (!selectedFile.type.startsWith('audio/')) {
        setError('Invalid file type. Please upload an audio file.')
        return
      }

      setFile(selectedFile)
    }
  }

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!file) {
      setError('Please upload a voice file.')
      return
    }

    if (text.length === 0) {
      setError('Please enter some text.')
      return
    }

    if (text.length > 500) {
      setError('Text is too long. Please limit to 500 characters.')
      return
    }

    setIsProcessing(true)

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-files')
        .upload(`input/${file.name}`, file)

      if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message)

      const { data: insertData, error: insertError } = await supabase
        .from('voice_files')
        .insert({
          original_filename: file.name,
          text_input: text,
          status: 'processing'
        })
        .select()

      if (insertError) throw new Error('Failed to save metadata: ' + insertError.message)

      await new Promise(resolve => setTimeout(resolve, 2000))

      const processedFileName = `processed_${file.name}`
      const { data: updateData, error: updateError } = await supabase
        .from('voice_files')
        .update({
          processed_filename: processedFileName,
          status: 'completed'
        })
        .eq('id', insertData[0].id)
        .select()

      if (updateError) throw new Error('Failed to update record: ' + updateError.message)

      const { data: urlData } = await supabase.storage
        .from('voice-files')
        .getPublicUrl(`input/${file.name}`)

      if (urlData) {
        setProcessedAudioUrl(urlData.publicUrl)
      } else {
        throw new Error('Failed to get public URL for the processed file')
      }
    } catch (error) {
      console.error('Error processing file:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (processedAudioUrl) {
      window.open(processedAudioUrl, '_blank')
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl text-white bg-black/50 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-pink-300">Voice Changer</CardTitle>
          <CardDescription className="text-center">Transform your voice with AI magic</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voice-file" className="text-sm font-medium">
                Upload Voice File (max 5MB)
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="voice-file"
                  type="file"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  accept="audio/*"
                  className="flex-1 bg-white text-gray-900 border-gray-300"
                  aria-describedby="file-error"
                />
                <Mic className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="text-input" className="text-sm font-medium">
                Enter Text (max 500 characters)
              </Label>
              <Textarea
                id="text-input"
                value={text}
                onChange={handleTextChange}
                placeholder="Enter the text you want the voice to say..."
                className="min-h-[100px] bg-white text-gray-900 border-gray-300"
                aria-describedby="text-error"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription id="file-error text-error">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={isProcessing || !file} className="w-full bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white border border-gray-700 transition-all duration-300">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Process Voice
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleDownload}
            disabled={!processedAudioUrl}
            className="w-full bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 text-white border border-gray-700 transition-all duration-300"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Processed Voice
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}