"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// Typen für TypeScript
interface Ferrata {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  status: string;
  topo_url: string;
}

interface Report {
  id: string;
  ferrata_id: string;
  type: string;
  description: string;
  created_at: string;
  verified: boolean;
}


