"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
// import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

// Define form schema
const formSchema = z.object({
  level: z.string().min(1, { message: "Please select a level" }),
  job: z.string().min(1, { message: "Please select a job type" }),
  languages: z.array(z.string()).min(1, { message: "Please select at least one language" }),
  interviewLanguage: z.string().min(1, { message: "Please select an interview language" }),
  country: z.string().min(1, { message: "Please select a country" }),
  interviewType: z.string().min(1, { message: "Please select an interview type" }),
  stage: z.string().min(1, { message: "Please select an interview stage" }),
  jobDescription: z.string().min(10, { message: "Job description must be at least 10 characters" }),
});

// Hard-coded language options to match original component
const languageOptions = [
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "cpp", label: "C++" },
  { id: "ruby", label: "Ruby" },
  { id: "go", label: "Go" },
  { id: "php", label: "PHP" },
  { id: "swift", label: "Swift" },
  { id: "kotlin", label: "Kotlin" },
];

interface InterviewFormProps {
  onSubmit: () => void;
}

export function InterviewForm({ onSubmit }: InterviewFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [options, setOptions] = useState({
    jobTypes: [],
    programmingLanguages: [],
    countries: [],
    remainingCredits: 0
  });

  // Fetch options from API (but we'll still use hard-coded values in UI for compatibility)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/interviews/options');
        if (!response.ok) {
          throw new Error('Failed to fetch options');
        }
        const data = await response.json();
        setOptions({
          jobTypes: data.jobTypes || [],
          programmingLanguages: data.programmingLanguages || [],
          countries: data.countries || [],
          remainingCredits: data.remainingCredits || 0
        });
      } catch (error) {
        console.error('Error fetching options:', error);

      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      level: "",
      job: "",
      languages: [],
      interviewLanguage: "",
      country: "",
      interviewType: "",
      stage: "",
      jobDescription: "",
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);


      // Create form data to handle file upload
      const formData = new FormData();

      // Map form fields to our API structure
      formData.append('level', values.level.toUpperCase());

      // Find the jobTypeId from the job value
      const selectedJobType = options.jobTypes.find(j => j.value === values.job);
      formData.append('jobTypeId', selectedJobType?.id || '');

      // Convert languages to programmingLanguageIds
      const programmingLanguageIds = values.languages.map((langValue: string) => {
        const lang = options.programmingLanguages.find(l => l.value === langValue);
        return lang?.id || '';
      }).filter(Boolean);
      formData.append('programmingLanguageIds', JSON.stringify(programmingLanguageIds));

      formData.append('interviewLanguage', values.interviewLanguage);

      // Find the countryId from the country value
      const selectedCountry = options.countries.find(c => c.value === values.country);
      formData.append('countryId', selectedCountry?.id || '');

      formData.append('interviewType', values.interviewType.toUpperCase());
      formData.append('stage', values.stage.toUpperCase());
      formData.append('jobDescription', values.jobDescription);

      // Default mode - can be changed if the original form adds a mode field
      formData.append('mode', 'TEXT_WITH_VOICE');

      // Add CV file if selected
      if (selectedFile) {
        formData.append('cv', selectedFile);
      }

      // Submit form to API
      const response = await fetch('/api/interviews', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create interview');
      }

      const data = await response.json();

      // Show success message
      // toast({
      //   title: 'Interview Created',
      //   description: 'Your interview has been created successfully.',
      // });

      // Call the onSubmit callback to close the modal
      onSubmit();

      // Redirect to interview page
      router.push(`/interviews/${data.interviewId}`);
    } catch (error: any) {
      console.error('Error creating interview:', error);
      // toast({
      //   title: 'Error',
      //   description: error.message || 'Failed to create interview. Please try again.',
      //   variant: 'destructive',
      // });
    } finally {
      setLoading(false);
    }
  };

  if (loadingOptions) {
    return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-gray-400">Loading interview options...</p>
        </div>
    );
  }

  return (
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-black/95 backdrop-blur-xl"
      >
        <div className="border-b border-gray-800">
          <div className="px-6 py-4">
            <h2 className="text-xl font-semibold text-white">New Interview Simulation</h2>
            <p className="text-sm text-gray-400">
              Configure your interview simulation settings
              {options.remainingCredits < 1 ? (
                  <span className="text-red-500 ml-2">
                (You have no credits remaining)
              </span>
              ) : (
                  <span className="text-green-500 ml-2">
                (Credits remaining: {options.remainingCredits})
              </span>
              )}
            </p>
          </div>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Experience Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 border-gray-800">
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="junior">Junior</SelectItem>
                              <SelectItem value="middle">Middle</SelectItem>
                              <SelectItem value="senior">Senior</SelectItem>
                              <SelectItem value="lead">Team Lead</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="job"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Job Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 border-gray-800">
                                <SelectValue placeholder="Select job type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="frontend">Frontend Developer</SelectItem>
                              <SelectItem value="backend">Backend Developer</SelectItem>
                              <SelectItem value="fullstack">Fullstack Developer</SelectItem>
                              <SelectItem value="mobile">Mobile Developer</SelectItem>
                              <SelectItem value="devops">DevOps Engineer</SelectItem>
                              <SelectItem value="qa">QA Engineer</SelectItem>
                              <SelectItem value="data">Data Scientist</SelectItem>
                              <SelectItem value="ml">Machine Learning Engineer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              <FormField
                  control={form.control}
                  name="languages"
                  render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel className="text-gray-200">Programming Languages</FormLabel>
                          <FormDescription className="text-gray-400">
                            Select the programming languages relevant to this interview
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {languageOptions.map((language) => (
                              <FormField
                                  key={language.id}
                                  control={form.control}
                                  name="languages"
                                  render={({ field }) => {
                                    return (
                                        <FormItem
                                            key={language.id}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(language.id)}
                                                onCheckedChange={(checked) => {
                                                  return checked
                                                      ? field.onChange([...field.value, language.id])
                                                      : field.onChange(
                                                          field.value?.filter(
                                                              (value) => value !== language.id
                                                          )
                                                      );
                                                }}
                                                className="border-gray-700"
                                            />
                                          </FormControl>
                                          <FormLabel className="font-normal text-gray-300">
                                            {language.label}
                                          </FormLabel>
                                        </FormItem>
                                    );
                                  }}
                              />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                  )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="interviewLanguage"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Interview Language</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 border-gray-800">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="english">English</SelectItem>
                              <SelectItem value="spanish">Spanish</SelectItem>
                              <SelectItem value="french">French</SelectItem>
                              <SelectItem value="german">German</SelectItem>
                              <SelectItem value="chinese">Chinese</SelectItem>
                              <SelectItem value="japanese">Japanese</SelectItem>
                              <SelectItem value="russian">Russian</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Country</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 border-gray-800">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="us">United States</SelectItem>
                              <SelectItem value="uk">United Kingdom</SelectItem>
                              <SelectItem value="canada">Canada</SelectItem>
                              <SelectItem value="australia">Australia</SelectItem>
                              <SelectItem value="germany">Germany</SelectItem>
                              <SelectItem value="france">France</SelectItem>
                              <SelectItem value="japan">Japan</SelectItem>
                              <SelectItem value="singapore">Singapore</SelectItem>
                              <SelectItem value="sweden">Sweden</SelectItem>
                              <SelectItem value="netherlands">Netherlands</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="interviewType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel className="text-gray-200">Interview Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="technical" className="border-gray-700" />
                                </FormControl>
                                <FormLabel className="font-normal text-gray-300">
                                  Technical (coding, architecture, system design)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="behavioral" className="border-gray-700" />
                                </FormControl>
                                <FormLabel className="font-normal text-gray-300">
                                  Behavioral (soft skills, team fit)
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="mixed" className="border-gray-700" />
                                </FormControl>
                                <FormLabel className="font-normal text-gray-300">
                                  Mixed (combination of both)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-200">Interview Stage</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-900 border-gray-800">
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="screening">Initial Screening</SelectItem>
                              <SelectItem value="technical">Technical Interview</SelectItem>
                              <SelectItem value="manager">Manager Interview</SelectItem>
                              <SelectItem value="final">Final Round</SelectItem>
                              <SelectItem value="onsite">Onsite Interview</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                    )}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="cv" className="text-gray-200">Upload CV/Resume (optional)</Label>
                <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                    className="cursor-pointer bg-gray-900 border-gray-800 file:bg-gray-800 file:text-gray-200 file:border-0"
                />
                {selectedFile && (
                    <p className="text-xs text-gray-400">
                      Selected file: {selectedFile.name}
                    </p>
                )}
              </div>

              <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-200">Job Description</FormLabel>
                        <FormControl>
                          <Textarea
                              placeholder="Paste the original job post description here..."
                              className="min-h-[120px] bg-gray-900 border-gray-800"
                              {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-400">
                          Providing the job description helps tailor the interview experience
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}
              />

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button
                    variant="outline"
                    type="button"
                    className="bg-transparent border-gray-700 text-gray-200 hover:bg-gray-800"
                    onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button
                    type="submit"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"

                >
                  {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                  ) : (
                      'Start Interview'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </motion.div>
  );
}
