package com.williandlima.pregflow.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.williandlima.pregflow.ui.editor.SermonEditorScreen
import com.williandlima.pregflow.ui.home.HomeScreen
import com.williandlima.pregflow.ui.preach.PreachModeScreen

object PregFlowDestinations {
    const val HOME = "home"
    const val EDITOR_ARG_SERMON_ID = "sermonId"
    const val EDITOR = "editor/{$EDITOR_ARG_SERMON_ID}"
    const val PREACH = "preach/{$EDITOR_ARG_SERMON_ID}"

    fun editorRoute(sermonId: String) = "editor/$sermonId"
    fun preachRoute(sermonId: String) = "preach/$sermonId"
}

@Composable
fun PregFlowNavHost() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = PregFlowDestinations.HOME) {
        composable(PregFlowDestinations.HOME) {
            HomeScreen(
                onOpenSermon = { sermonId ->
                    navController.navigate(PregFlowDestinations.editorRoute(sermonId))
                },
            )
        }
        composable(
            route = PregFlowDestinations.EDITOR,
            arguments = listOf(navArgument(PregFlowDestinations.EDITOR_ARG_SERMON_ID) { type = NavType.StringType }),
        ) {
            SermonEditorScreen(
                onBack = { navController.popBackStack() },
                onPreach = { sermonId -> navController.navigate(PregFlowDestinations.preachRoute(sermonId)) },
            )
        }
        composable(
            route = PregFlowDestinations.PREACH,
            arguments = listOf(navArgument(PregFlowDestinations.EDITOR_ARG_SERMON_ID) { type = NavType.StringType }),
        ) {
            PreachModeScreen(onClose = { navController.popBackStack() })
        }
        // Próximas rotas (Fase 4+): busca bíblica, configurações, login.
    }
}
