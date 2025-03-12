import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Types pour les données de test
interface Conversation {
    id: string;
    product_id: string;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    read: boolean;
    created_at: string;
}

interface Profile {
    id: string;
    username: string;
    full_name: string;
}

// Variables pour les données de test
let testProfiles: Profile[] = [];
let testConversation: Conversation;
let testProductId: string;
const createdConversations: string[] = [];

/**
 * Approche modifiée pour créer des profils de test pour les tests de messagerie
 */
describe('Système de messagerie', () => {
    // Avant tous les tests: créer les utilisateurs de test
    beforeAll(async () => {
        try {
            // Utiliser des IDs fixes pour les tests plutôt que des UUID aléatoires
            const testIds = [
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000002'
            ];
            
            // 1. Supprimer d'abord les profils s'ils existent déjà (pour éviter les doublons)
            for (const id of testIds) {
                await supabase.from('profiles').delete().eq('id', id);
            }
            
            // 2. Créer les profils de test individuellement
            for (let i = 0; i < testIds.length; i++) {
                const { error } = await supabase.rpc('insert_test_data', {
                    test_id: testIds[i],
                    test_username: `testuser${i+1}_${Date.now()}`,
                    test_full_name: `Test User ${i+1}`
                });
                
                if (error) {
                    console.error(`Erreur lors de l'insertion du profil ${i+1}:`, error);
                    throw error;
                }
            }
            
            // 3. Récupérer les profils pour confirmer leur création
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, full_name')
                .in('id', testIds);
                
            if (profilesError) {
                console.error('Erreur lors de la récupération des profils:', profilesError);
                throw profilesError;
            }
            
            if (!profiles || profiles.length !== 2) {
                throw new Error(`Échec de la création des profils de test: Seulement ${profiles?.length || 0} profils créés sur 2 attendus`);
            }
            
            testProfiles = profiles;
            console.log('Profils de test créés avec succès:', testProfiles.map(p => p.id));
            
        } catch (error) {
            console.error('Erreur dans beforeAll:', error);
            throw error;
        }
    });
    
    beforeEach(async () => {
        // Créer un produit et une conversation pour chaque test
        testProductId = uuidv4();
        
        try {
            // Créer une conversation pour les tests
            const { data, error } = await supabase
                .from('conversations')
                .insert({ product_id: testProductId })
                .select();
                
            if (error) {
                console.error('Erreur lors de la création de la conversation:', error);
                throw error;
            }
            
            if (!data || data.length === 0) {
                throw new Error('Aucune conversation créée');
            }
            
            testConversation = data[0];
            createdConversations.push(testConversation.id);
            
            // Ajouter les participants à la conversation
            const participants = testProfiles.map(profile => ({
                conversation_id: testConversation.id,
                user_id: profile.id
            }));
            
            const { error: participantError } = await supabase
                .from('conversation_participants')
                .insert(participants);
                
            if (participantError) {
                console.error('Erreur lors de l\'ajout des participants:', participantError);
                throw participantError;
            }
        } catch (error) {
            console.error('Erreur dans beforeEach:', error);
            throw error;
        }
    });
    
    // Après tous les tests: nettoyer les données
    afterAll(async () => {
        try {
            // 1. Supprimer toutes les conversations créées
            if (createdConversations.length > 0) {
                await supabase
                    .from('conversations')
                    .delete()
                    .in('id', createdConversations);
            }
            
            // 2. Supprimer les profils créés pour les tests
            if (testProfiles.length > 0) {
                await supabase
                    .from('profiles')
                    .delete()
                    .in('id', testProfiles.map(p => p.id));
            }
            
            console.log('Nettoyage des données de test terminé');
        } catch (error) {
            console.error('Erreur lors du nettoyage:', error);
        }
    });
    
    it('devrait créer une conversation avec un ID de produit', async () => {
        const productId = uuidv4();
        const { data, error } = await supabase
            .from('conversations')
            .insert({ product_id: productId })
            .select();
            
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.[0]?.product_id).toBe(productId);
        
        // Ajouter à la liste des conversations à nettoyer
        if (data?.[0]?.id) {
            createdConversations.push(data[0].id);
        }
    });
    
    it('devrait ajouter des participants à une conversation', async () => {
        // Vérifier que les participants ont bien été ajoutés dans beforeEach
        const { data, error } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', testConversation.id);
            
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.length).toBe(2);
        
        const participantIds = data?.map(p => p.user_id) || [];
        expect(participantIds).toContain(testProfiles[0].id);
        expect(participantIds).toContain(testProfiles[1].id);
    });
    
    it('devrait envoyer un message dans une conversation', async () => {
        const content = 'Test message ' + Date.now();
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: testConversation.id,
                sender_id: testProfiles[0].id,
                content,
                read: false
            })
            .select();
            
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.[0]?.content).toBe(content);
        expect(data?.[0]?.sender_id).toBe(testProfiles[0].id);
    });
    
    it('devrait récupérer les messages d\'une conversation', async () => {
        // Envoyer deux messages de test
        const message1 = 'Premier message de test ' + Date.now();
        const message2 = 'Deuxième message de test ' + Date.now();
        
        await supabase
            .from('messages')
            .insert([
                {
                    conversation_id: testConversation.id,
                    sender_id: testProfiles[0].id,
                    content: message1,
                    read: false
                },
                {
                    conversation_id: testConversation.id,
                    sender_id: testProfiles[1].id,
                    content: message2,
                    read: false
                }
            ]);
            
        // Récupérer les messages
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', testConversation.id)
            .order('created_at', { ascending: true });
            
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.length).toBeGreaterThanOrEqual(2);
        
        // Vérifier que les deux messages sont présents
        const messages = data || [];
        const hasMessage1 = messages.some(m => m.content === message1);
        const hasMessage2 = messages.some(m => m.content === message2);
        
        expect(hasMessage1).toBe(true);
        expect(hasMessage2).toBe(true);
    });
    
    it('devrait marquer un message comme lu', async () => {
        // Envoyer un message de test
        const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .insert({
                conversation_id: testConversation.id,
                sender_id: testProfiles[0].id,
                content: 'Message à marquer comme lu',
                read: false
            })
            .select();
            
        expect(messageError).toBeNull();
        expect(messageData).not.toBeNull();
        
        const messageId = messageData?.[0]?.id;
        
        // Marquer le message comme lu
        const { data, error } = await supabase
            .from('messages')
            .update({ read: true })
            .eq('id', messageId)
            .select();
            
        expect(error).toBeNull();
        expect(data?.[0]?.read).toBe(true);
    });
    
    it('devrait rejeter un message avec un ID utilisateur inexistant', async () => {
        // Tenter d'envoyer un message avec un UUID inexistant comme foreign key
        const { error } = await supabase
            .from('messages')
            .insert({
                conversation_id: testConversation.id,
                sender_id: '11111111-1111-1111-1111-111111111111', // UUID arbitraire qui n'existe pas
                content: 'Ce message ne devrait pas être accepté',
                read: false
            });
            
        // L'erreur devrait être une violation de contrainte foreign key
        expect(error).not.toBeNull();
        expect(error?.code).toBe('23503'); // Code PostgreSQL pour violation de foreign key
    });
    
    it('devrait récupérer les conversations d\'un utilisateur', async () => {
        // Récupérer les conversations pour le premier utilisateur
        const { data, error } = await supabase
            .from('conversation_participants')
            .select(`
                conversation_id,
                conversations (
                    id,
                    product_id,
                    created_at,
                    updated_at
                )
            `)
            .eq('user_id', testProfiles[0].id);
            
        expect(error).toBeNull();
        expect(data).not.toBeNull();
        expect(data?.length).toBeGreaterThanOrEqual(1);
        
        // Vérifier que la conversation de test est présente
        const hasTestConversation = data?.some(item => 
            item.conversation_id === testConversation.id
        );
        
        expect(hasTestConversation).toBe(true);
    });
});