#!/usr/bin/env ruby
$LOAD_PATH[0, 0] = File.join(File.dirname(__FILE__), '..', 'lib')

require 'linguist'
require 'rugged'
require 'json'
require 'optparse'

path = "."
breakdown = false
json_breakdown = false
target_languages = []

if ARGV[0] == "--breakdown" || ARGV[0] == "--json"
  path = Dir.pwd
else
  path = ARGV[0] || "."
  ARGV.shift
end

if ARGV[0] == "--breakdown"
  breakdown = true
  ARGV.shift
end
if ARGV[0] == "--json"
  json_breakdown = true
  ARGV.shift
end
if ARGV[0]
  if ARGV[1]
    target_languages = ARGV
  else
    target_languages = ARGV[0].split(/[ ,]/)
  end
  target_languages.map! &:downcase
end

if File.directory?(path)
  rugged = Rugged::Repository.new(path)
  repo = Linguist::Repository.new(rugged, rugged.head.target_id)
  if !json_breakdown && target_languages.empty?
    repo.languages.sort_by { |_, size| size }.reverse.each do |language, size|
      percentage = ((size / repo.size.to_f) * 100)
      percentage = sprintf '%.2f' % percentage
      puts "%-7s %9s %s" % ["#{percentage}%", "#{size}B", language]
    end
  end
  if target_languages.any?
    repo.breakdown_by_file.each do |lang, files|
      if target_languages.include? lang.downcase
        files.each do |file|
          puts file
        end
      end
    end
  elsif breakdown
    puts
    file_breakdown = repo.breakdown_by_file
    file_breakdown.each do |lang, files|
      puts "#{lang}:"
      files.each do |file|
        puts file
      end
      puts
    end
  elsif json_breakdown
    puts JSON.dump(repo.breakdown_by_file)
  end
elsif File.file?(path)
  blob = Linguist::FileBlob.new(path, Dir.pwd)
  type = if blob.text?
    'Text'
  elsif blob.image?
    'Image'
  else
    'Binary'
  end

  puts "#{blob.name}: #{blob.loc} lines (#{blob.sloc} sloc)"
  puts "  type:      #{type}"
  puts "  mime type: #{blob.mime_type}"
  puts "  language:  #{blob.language}"

  if blob.large?
    puts "  blob is too large to be shown"
  end

  if blob.generated?
    puts "  appears to be generated source code"
  end

  if blob.vendored?
    puts "  appears to be a vendored file"
  end
else
  abort <<-HELP
  Linguist v#{Linguist::VERSION}
  Detect language type for a file, or, given a repository, determine language breakdown.
  Usage: linguist <path> [...target language list]
         linguist <path> [--breakdown] [--json] [...target language list]
         linguist [--breakdown] [--json] [...target language list]
  HELP
end
